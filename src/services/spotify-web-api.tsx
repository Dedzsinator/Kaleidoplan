import axios from 'axios';

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.REACT_APP_SPOTIFY_REDIRECT_URI || 'http://localhost:3001/spotify-callback';

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
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
      }) => any;
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

// Convert Spotify preview URLs to our proxy URLs
function convertToProxyUrl(previewUrl: string | null): string | null {
  if (!previewUrl) return null;

  // Check if already using our proxy
  if (previewUrl.startsWith('/api/spotify/preview/')) {
    return previewUrl;
  }

  // Extract the preview ID from the Spotify URL
  const match = previewUrl.match(/\/mp3-preview\/([a-zA-Z0-9]+)/);
  if (!match || !match[1]) return previewUrl; // Return original if no match

  // Return our proxy URL
  return `/api/spotify/preview/${match[1]}`;
}

// Updated with more reliable tracks that have accurate preview URLs
const mockTracks: Record<string, any> = {
  // Drake - Hotline Bling (known to have a working preview)
  '6DCZcSspjsKoFjzjrWoCdn': {
    name: 'Hotline Bling',
    artists: [{ name: 'Drake' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739416ed64daf84936d89e671c' }] },
    preview_url: 'https://p.scdn.co/mp3-preview/4841842825a5e78082b1c03886c9034cd82a0d7b',
  },
  // Ed Sheeran - Shape of You
  '7qiZfU4dY1lWllzX7mPBI3': {
    name: 'Shape of You',
    artists: [{ name: 'Ed Sheeran' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] },
    preview_url: 'https://p.scdn.co/mp3-preview/f8c30995f84b3dd3fe0c4dde76633688cce71112',
  },
  // The Weeknd - Blinding Lights
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

  // Web Playback SDK properties
  player: any = null;
  deviceId: string | null = null;
  isPlayerReady: boolean = false;
  isPlayerConnected: boolean = false;

  constructor() {
    this.loadTokens();

    // Check if we have client credentials
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.warn('Spotify client credentials missing, will use mock data only');
      this.useMockCredentials = true;
      this.accessToken = 'mock-token';
      this.expiresAt = Date.now() + 3600 * 1000; // 1 hour
    }
  }

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

      console.log('Loaded Spotify tokens from storage, user authenticated:', this.userAuthenticated);
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

      console.log('Saved Spotify tokens to storage');
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  };

  authenticate = async (): Promise<string | null> => {
    // First check if user is authenticated
    const isUser = await this.isUserAuthenticated();

    if (isUser && this.accessToken) {
      return this.accessToken;
    }

    if (this.useMockCredentials) {
      console.log('Using mock authentication (no client credentials)');
      return 'mock-token-for-fallback';
    }

    // Check if we have a valid token
    const now = Date.now();
    if (this.accessToken && this.expiresAt > now) {
      console.log('Using existing valid Spotify token');
      return this.accessToken;
    }

    try {
      console.log('Attempting Spotify authentication...');

      // Get client credentials token
      const authString = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

      // Form data must be properly formatted
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

      console.log('New Spotify token acquired');
      return this.accessToken;
    } catch (error) {
      console.error('Error authenticating with Spotify:', error);

      // Set flag to use mock data for the remainder of this session
      this.useMockCredentials = true;

      // Return a mock token
      console.log('Using mock authentication for fallback experience');
      this.accessToken = 'mock-token-for-fallback';
      this.expiresAt = Date.now() + 3600 * 1000; // Expires in 1 hour
      return this.accessToken;
    }
  };

  getTrack = async (trackId: string): Promise<any> => {
    try {
      // First check if we have mock data for this track
      if (mockTracks[trackId]) {
        console.log(`Using mock data for track ${trackId}`);
        return mockTracks[trackId];
      }

      // If we're in mock mode, don't attempt API calls
      if (this.useMockCredentials) {
        throw new Error('Using mock data only');
      }

      // Try to get real data from Spotify
      const token = await this.authenticate();
      if (!token) {
        throw new Error('No Spotify access token available');
      }

      const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Convert preview URL to use our proxy
      if (response.data && response.data.preview_url) {
        response.data.preview_url = convertToProxyUrl(response.data.preview_url);
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching track ${trackId}:`, error);

      // Use a fallback track when the requested track doesn't exist
      const fallbackIds = Object.keys(mockTracks);
      const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
      console.log(`Using fallback track ${randomId}`);
      return mockTracks[randomId];
    }
  };

  isUserAuthenticated = async (): Promise<boolean> => {
    await this.loadTokens();

    // If we have a refresh token, user has authenticated
    if (this.refreshToken && this.userAuthenticated) {
      // Check if token is valid or needs refresh
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
    console.log('Getting Spotify authorization URL with redirect URI:', REDIRECT_URI);

    // Store state for verification after redirect
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
    console.log('Authorization URL generated:', url);
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

      // If a new refresh token is provided, save it
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
    // Disconnect Web Playback SDK if connected
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

    console.log('Disconnected from Spotify');
  };

  // Initialize Spotify Web Playback SDK
  initializePlayer = async (): Promise<boolean> => {
    if (!this.userAuthenticated || !this.accessToken) {
      console.warn('Cannot initialize Spotify player: user not authenticated');
      return false;
    }

    if (this.isPlayerReady) {
      console.log('Spotify player already initialized');
      return true;
    }

    try {
      console.log('Loading Spotify Web Playback SDK...');
      await loadScript('https://sdk.scdn.co/spotify-player.js');

      return new Promise((resolve) => {
        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log('Spotify Web Playback SDK ready');

          this.player = new window.Spotify.Player({
            name: 'Kaleidoplan Web Player',
            getOAuthToken: (cb: (token: string) => void) => {
              console.log('Providing token to Spotify player');
              cb(this.accessToken || '');
            },
            volume: 0.5,
          });

          // Error handling
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

          // Playback status updates
          this.player.addListener('player_state_changed', (state: any) => {
            console.log(
              'Spotify playback state changed:',
              state ? `${state.track_window.current_track.name} - ${state.paused ? 'Paused' : 'Playing'}` : 'No track',
            );
          });

          // Ready
          this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('Spotify player ready with device ID:', device_id);
            this.deviceId = device_id;
            this.isPlayerReady = true;
            this.isPlayerConnected = true;
            resolve(true);
          });

          // Not ready
          this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('Spotify player disconnected from device ID:', device_id);
            this.isPlayerReady = false;
            this.isPlayerConnected = false;
          });

          // Connect to the player
          this.player.connect().then((success: boolean) => {
            if (!success) {
              console.error('Failed to connect to Spotify player');
              resolve(false);
            }
          });
        };
      });
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
      return false;
    }
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

      console.log(`Playing track ${trackId} on device ${this.deviceId}`);

      // We need to refresh the token to make sure it's valid
      await this.authenticate();

      // Play the track
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
      } catch (axiosError) {
        // Check if it's a 404 Not Found error (track unavailable)
        if (axios.isAxiosError(axiosError) && axiosError.response?.status === 404) {
          console.warn(`Track ${trackId} not available for playback (404 error)`);

          // Try playing one of our known good tracks instead
          const fallbackIds = Object.keys(mockTracks);
          const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
          console.log(`Trying fallback track ${randomId} instead`);

          try {
            await axios.put(
              `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
              {
                uris: [`spotify:track:${randomId}`],
              },
              {
                headers: {
                  Authorization: `Bearer ${this.accessToken}`,
                  'Content-Type': 'application/json',
                },
              },
            );
            return true;
          } catch (fallbackError) {
            console.error('Failed to play fallback track:', fallbackError);
            return false;
          }
        }

        // If it's a 403 error, user likely doesn't have Premium
        if (axios.isAxiosError(axiosError) && axiosError.response?.status === 403) {
          console.warn('Spotify Premium required for playback control');
        }

        throw axiosError; // Re-throw for the calling code to handle
      }
    } catch (error) {
      console.error('Error playing with Spotify:', error);
      return false;
    }
  };

  // Pause playback (requires Premium)
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

  // Resume playback (requires Premium)
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

  // Play tracks using audio element for non-Premium users
  playTrack = async (trackId: string | undefined): Promise<string | null> => {
    if (!trackId) {
      console.error('Invalid track ID provided to playTrack');
      return null;
    }

    // If user is authenticated, try to use the Web Playback SDK (Premium users)
    if (this.userAuthenticated) {
      try {
        const success = await this.playTrackWithSpotify(trackId);
        if (success) {
          console.log('Playing track via Spotify Web Playback SDK');
          return 'spotify:sdk:playing';
        }
      } catch (error) {
        console.warn('Failed to play via Spotify SDK, falling back to preview URL:', error);
      }
    }

    // If SDK playback failed or user is not Premium, fall back to preview URLs
    try {
      const track = await this.getTrack(trackId);

      if (!track || !track.preview_url) {
        console.log(`No preview URL for track ${trackId}, using fallback`);
        // Try a guaranteed working preview URL
        return 'https://p.scdn.co/mp3-preview/4841842825a5e78082b1c03886c9034cd82a0d7b'; // Drake - Hotline Bling
      }

      // Return the preview URL
      console.log(`Using preview URL for track ${trackId}: ${track.preview_url}`);
      return track.preview_url;
    } catch (error) {
      console.error(`Error playing track ${trackId}:`, error);
      // Always have a fallback that works
      return 'https://p.scdn.co/mp3-preview/4841842825a5e78082b1c03886c9034cd82a0d7b';
    }
  };

  // Toggle play/pause on the current track
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

  // Skip to next track in context
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

  // Skip to previous track in context
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

// Create singleton instance
const spotifyService = new SpotifyService();
export default spotifyService;
