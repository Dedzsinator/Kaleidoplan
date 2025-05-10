import axios from 'axios';
import { Track } from '@models/types';

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyAlbum {
  id?: string;
  name?: string;
  images: SpotifyImage[];
}

interface SpotifyArtist {
  id?: string;
  name: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
  uri?: string;
  duration_ms?: number;
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    callback: (event: { message: string }) => void,
  ): void;
  addListener(event: 'player_state_changed', callback: (state: SpotifyPlaybackState | null) => void): void;
  addListener(event: 'ready' | 'not_ready', callback: (event: { device_id: string }) => void): void;
  removeListener: (event: string) => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

interface SpotifyPlaybackState {
  context: {
    uri: string | null;
    metadata: Record<string, unknown>;
  };
  disallows: {
    pausing: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  duration: number;
  paused: boolean;
  position: number;
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || 'http://localhost:3001/spotify-callback';

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.head.appendChild(script);
  });
};

declare global {
  interface Window {
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const TokenStorage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

function convertToProxyUrl(previewUrl: string | null): string | null {
  if (!previewUrl) return null;

  if (previewUrl.startsWith('/api/spotify/preview/')) {
    return previewUrl;
  }

  const match = previewUrl.match(/\/mp3-preview\/([a-zA-Z0-9]+)/);
  if (!match || !match[1]) return previewUrl;

  return `/api/spotify/preview/${match[1]}`;
}

const mockTracks: Record<string, Partial<SpotifyTrack>> = {
  '6DCZcSspjsKoFjzjrWoCdn': {
    name: 'Hotline Bling',
    artists: [{ name: 'Drake' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739416ed64daf84936d89e671c' }] },
    preview_url: 'https://p.scdn.co/mp3-preview/4841842825a5e78082b1c03886c9034cd82a0d7b',
  },
  '7qiZfU4dY1lWllzX7mPBI3': {
    name: 'Shape of You',
    artists: [{ name: 'Ed Sheeran' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] },
    preview_url: 'https://p.scdn.co/mp3-preview/f8c30995f84b3dd3fe0c4dde76633688cce71112',
  },
  '0VjIjW4GlUZAMYd2vXMi3b': {
    name: 'Blinding Lights',
    artists: [{ name: 'The Weeknd' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] },
    preview_url: 'https://p.scdn.co/mp3-preview/3eb16018c2a700240e9dfb8817b6f2d041f15eb1',
  },
};

class SpotifyService {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  expiresAt: number = 0;
  useMockCredentials: boolean = false;
  userAuthenticated: boolean = false;

  player: SpotifyPlayer | null = null;
  deviceId: string | null = null;
  isPlayerReady: boolean = false;
  isPlayerConnected: boolean = false;

  constructor() {
    this.loadTokens();

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.warn('Spotify client credentials missing, will use mock data only');
      this.useMockCredentials = true;
      this.accessToken = 'mock-token';
      this.expiresAt = Date.now() + 3600 * 1000; // 1 hour
    }
  }

  checkPremiumStatus = async (): Promise<boolean> => {
    if (this.userAuthenticated === undefined) {
      return false;
    }

    try {
      const token = await this.authenticate?.();
      if (!token) {
        return false;
      }

      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.product === 'premium';
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  };

  loadTokens = async (): Promise<void> => {
    try {
      const token = await TokenStorage.getItem('spotify_access_token');
      const refresh = await TokenStorage.getItem('spotify_refresh_token');
      const expires = await TokenStorage.getItem('spotify_expires_at');
      const userAuth = await TokenStorage.getItem('spotify_user_authenticated');

      if (token) this.accessToken = token;
      if (refresh) this.refreshToken = refresh;
      if (expires) this.expiresAt = parseInt(expires, 10);
      if (userAuth) this.userAuthenticated = userAuth === 'true';
    } catch (error) {
      console.error('Error loading Spotify tokens:', error);
    }
  };

  saveTokens = async (): Promise<void> => {
    try {
      if (this.accessToken) {
        await TokenStorage.setItem('spotify_access_token', this.accessToken);
      }

      if (this.refreshToken) {
        await TokenStorage.setItem('spotify_refresh_token', this.refreshToken);
      }

      if (this.expiresAt) {
        await TokenStorage.setItem('spotify_expires_at', this.expiresAt.toString());
      }

      await TokenStorage.setItem('spotify_user_authenticated', this.userAuthenticated.toString());
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  };

  authenticate = async (): Promise<string | null> => {
    const isUser = await this.isUserAuthenticated();

    if (isUser && this.accessToken) {
      return this.accessToken;
    }

    if (this.useMockCredentials) {
      return 'mock-token-for-fallback';
    }

    const now = Date.now();
    if (this.accessToken && this.expiresAt > now) {
      return this.accessToken;
    }

    try {
      const authString = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');

      const response = await axios.post('https://accounts.spotify.com/api/token', formData, {
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + response.data.expires_in * 1000;
      await this.saveTokens();

      return this.accessToken;
    } catch (error) {
      console.error('Error authenticating with Spotify:', error);

      this.useMockCredentials = true;

      // Return a mock token
      this.accessToken = 'mock-token-for-fallback';
      this.expiresAt = Date.now() + 3600 * 1000;
      return this.accessToken;
    }
  };

  isUserAuthenticated = async (): Promise<boolean> => {
    await this.loadTokens();

    if (this.refreshToken && this.userAuthenticated) {
      if (this.expiresAt < Date.now()) {
        try {
          await this.refreshAccessToken();
          return true;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          return false;
        }
      }
      return true;
    }

    return false;
  };

  getAuthorizationUrl = async (): Promise<string> => {
    const state = Math.random().toString(36).substring(2, 15);

    await TokenStorage.setItem('spotify_auth_state', state);

    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-library-read',
    ];

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      state: state,
      scope: scopes.join(' '),
      show_dialog: 'true',
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return url;
  };

  handleCallback = async (code: string, state: string): Promise<boolean> => {
    const savedState = await TokenStorage.getItem('spotify_auth_state');

    if (!savedState || savedState !== state) {
      throw new Error('State mismatch. Possible cross-site request forgery.');
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.expiresAt = Date.now() + response.data.expires_in * 1000;
      this.userAuthenticated = true;

      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return false;
    }
  };

  refreshAccessToken = async (): Promise<boolean> => {
    if (!this.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + response.data.expires_in * 1000;

      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }

      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return false;
    }
  };

  disconnect = async (): Promise<void> => {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isPlayerReady = false;
      this.isPlayerConnected = false;
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.userAuthenticated = false;

    await TokenStorage.removeItem('spotify_access_token');
    await TokenStorage.removeItem('spotify_refresh_token');
    await TokenStorage.removeItem('spotify_expires_at');
    await TokenStorage.removeItem('spotify_user_authenticated');
  };

  initializePlayer = async (): Promise<boolean> => {
    if (!this.userAuthenticated || !this.accessToken) {
      console.warn('Cannot initialize Spotify player: user not authenticated');
      return false;
    }

    if (this.isPlayerReady) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        // Define the global callback BEFORE loading the script
        window.onSpotifyWebPlaybackSDKReady = () => {
          this.player = new window.Spotify.Player({
            name: 'Kaleidoplan Web Player',
            getOAuthToken: (cb: (token: string) => void) => {
              cb(this.accessToken || '');
            },
            volume: 0.5,
          });

          this.player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.error('Spotify player initialization error:', message);
            resolve(false);
          });

          this.player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.error('Spotify player authentication error:', message);
            resolve(false);
          });

          this.player.addListener('account_error', ({ message }: { message: string }) => {
            console.error('Spotify player account error (Premium required):', message);
            resolve(false);
          });

          this.player.addListener('playback_error', ({ message }: { message: string }) => {
            console.error('Spotify player playback error:', message);
          });

          this.player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
            // Handle player state changes if needed
          });

          this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
            this.deviceId = device_id;
            this.isPlayerReady = true;
            this.isPlayerConnected = true;
            resolve(true);
          });

          this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.warn('Spotify player not ready:', device_id);
            this.isPlayerReady = false;
            this.isPlayerConnected = false;
          });

          // Connect to Spotify
          this.player.connect().then((success: boolean) => {
            if (!success) {
              console.error('Failed to connect to Spotify player');
              resolve(false);
            }
          });
        };

        // Load the Spotify SDK script
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;

        script.onerror = () => {
          console.error('Failed to load Spotify Web Playback SDK');
          resolve(false);
        };

        document.body.appendChild(script);

        // Set a timeout in case something goes wrong
        setTimeout(() => {
          if (!this.isPlayerReady) {
            console.error('Spotify player initialization timed out');
            resolve(false);
          }
        }, 15000); // 15 seconds timeout
      } catch (error) {
        console.error('Error in Spotify player initialization:', error);
        resolve(false);
      }
    });
  };

  playTrackWithSpotify = async (trackId: string): Promise<boolean> => {
    if (!this.userAuthenticated) {
      console.warn('User not authenticated, cannot play with Spotify');
      return false;
    }

    try {
      // Initialize player if needed
      if (!this.isPlayerReady) {
        const initialized = await this.initializePlayer();
        if (!initialized) {
          console.warn('Failed to initialize Spotify player');
          return false;
        }
      }

      if (!this.deviceId) {
        console.warn('No device ID available for playback');
        return false;
      }

      await this.authenticate();

      // Log track info for debugging
      try {
        // First check if the track exists and is playable
        const trackInfo = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });

        try {
          await axios.put(
            `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
            {
              uris: [`spotify:track:${trackId}`],
            },
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );

          return true;
        } catch (playError) {
          if (playError instanceof Error && playError.message.includes('CloudPlaybackClientError')) {
            console.warn('CloudPlaybackClientError detected but playback may still work');
            return true; // Try to continue despite the error
          }
          // If direct playback fails, log and check for alternatives
          console.warn(
            `Failed to play track ${trackId}: ${playError instanceof Error ? playError.message : String(playError)}`,
          );

          // Check if preview URL is available
          if (trackInfo.data.preview_url) {
            return false; // Signal caller to use preview URL instead
          }

          console.warn(`Track ${trackId} exists but is not playable and has no preview. Try next track.`);
          return false;
        }
      } catch (axiosError) {
        // Handle known error cases
        if (axios.isAxiosError(axiosError)) {
          // Handle CloudPlaybackClientError separately - this often happens but playback still works
          if (
            axiosError.message?.includes('CloudPlaybackClientError') ||
            (axiosError.response?.status === 404 && axiosError.config?.url?.includes('cpapi.spotify.com'))
          ) {
            // This is the error you're seeing - it's not critical and playback often still works
            console.warn('CloudPlaybackClientError detected but playback may still work');
            return true; // Try to continue despite the error
          }

          if (axiosError.response?.status === 403 && axiosError.response?.data?.error?.reason === 'PREMIUM_REQUIRED') {
            console.warn('Premium subscription is required');
            return false;
          }

          if (axiosError.response?.status === 404) {
            console.warn(`Track ${trackId} not available (404 error). Moving to next track.`);
            return false;
          }
        }

        throw axiosError;
      }
    } catch (error) {
      // Catch-all for other errors
      if (error instanceof Error && error.message?.includes('CloudPlaybackClientError')) {
        console.warn('CloudPlaybackClientError caught but continuing playback attempt');
        return true; // Try to continue despite the error
      }

      console.error('Error playing with Spotify:', error);
      return false;
    }
  };

  pausePlayback = async (): Promise<boolean> => {
    if (!this.isPlayerReady || !this.player) {
      return false;
    }

    try {
      await this.player.pause();
      return true;
    } catch (error) {
      console.error('Error pausing playback:', error);
      return false;
    }
  };

  resumePlayback = async (): Promise<boolean> => {
    if (!this.isPlayerReady || !this.player) {
      return false;
    }

    try {
      await this.player.resume();
      return true;
    } catch (error) {
      console.error('Error resuming playback:', error);
      return false;
    }
  };

  getTrack = async (trackId: string): Promise<Partial<SpotifyTrack>> => {
    try {
      // First check if we have this track in our mock data
      if (mockTracks[trackId]) {
        return mockTracks[trackId];
      }

      if (this.useMockCredentials) {
        // Return default track instead of throwing an error
        return mockTracks['default'];
      }

      const token = await this.authenticate();
      if (!token) {
        return mockTracks['default'];
      }

      const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.preview_url) {
        response.data.preview_url = convertToProxyUrl(response.data.preview_url);
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching track ${trackId}:`, error);

      // Return default track to avoid playback errors
      return mockTracks['default'];
    }
  };

  playTrack = async (trackId: string | undefined): Promise<string | null> => {
    if (!trackId) {
      console.warn('Invalid track ID provided to playTrack, using default');
      return mockTracks['default']?.preview_url || null;
    }

    if (this.userAuthenticated) {
      try {
        const success = await this.playTrackWithSpotify(trackId);
        if (success) {
          return 'spotify:sdk:playing';
        }
        // If Spotify SDK playback fails, we'll fall through to preview URL
        console.warn(`Spotify SDK playback failed for ${trackId}, trying preview URL`);
      } catch (error) {
        console.warn('Failed to play via Spotify SDK, falling back to preview URL:', error);
      }
    }

    try {
      // Get track details including preview URL
      const track = await this.getTrack(trackId);

      if (!track || !track.preview_url) {
        console.warn(`No preview URL for track ${trackId}, will try next track`);
        // Return a special value that indicates "move to next track"
        return 'NEXT_TRACK';
      }

      return track.preview_url;
    } catch (error) {
      console.error(`Error playing track ${trackId}:`, error);
      return 'NEXT_TRACK';
    }
  };

  togglePlayback = async (): Promise<boolean> => {
    if (!this.isPlayerReady || !this.player) return false;

    try {
      const state = await this.player.getCurrentState();
      if (!state) {
        console.warn('No current playback state');
        return false;
      }

      if (state.paused) {
        await this.player.resume();
      } else {
        await this.player.pause();
      }

      return true;
    } catch (error) {
      console.error('Error toggling playback:', error);
      return false;
    }
  };

  skipToNext = async (): Promise<boolean> => {
    if (!this.isPlayerReady || !this.player) return false;

    try {
      await this.player.nextTrack();
      return true;
    } catch (error) {
      console.error('Error skipping to next track:', error);
      return false;
    }
  };

  skipToPrevious = async (): Promise<boolean> => {
    if (!this.isPlayerReady || !this.player) return false;

    try {
      await this.player.previousTrack();
      return true;
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      return false;
    }
  };
}

const spotifyService = new SpotifyService();
export default spotifyService;
