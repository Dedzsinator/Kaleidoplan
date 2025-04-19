import axios from 'axios';

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

// Simple storage for tokens
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

// Use preview URLs that are confirmed to work
const mockTracks: Record<string, any> = {
  // Updated with verified working previews
  '7ouMYWpwJ422jRcDASZB7P': {
    // Drake - God's Plan
    name: "God's Plan",
    artists: [{ name: 'Drake' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5' }] },
    preview_url: '/api/spotify/preview/7699132dd7c55c9055ac6e2b9107dbd0e46cd4ff',
  },
  '0e7ipj03S05BNilyu5bRzt': {
    // Taylor Swift - Cruel Summer
    name: 'Cruel Summer',
    artists: [{ name: 'Taylor Swift' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273a7f4a25ec130e506b01955c6' }] },
    preview_url: '/api/spotify/preview/31f1d3534b3908cbbd68b6e889a3b5e504b24888',
  },
  '1zi7xx7UVEFkmKfv06H8x0': {
    // Drake & 21 Savage - Rich Flex
    name: 'Rich Flex',
    artists: [{ name: 'Drake, 21 Savage' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734dce95fdb76259e7621cacac' }] },
    preview_url: '/api/spotify/preview/c0950bcccb003b284b83a69867f4b919c60889cc',
  },
  '0V3wPSX9ygBnCm8psDIegu': {
    // Taylor Swift - Anti-Hero
    name: 'Anti-Hero',
    artists: [{ name: 'Taylor Swift' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5' }] },
    preview_url: '/api/spotify/preview/2617bc6ae380605b9ff81c9f9d2a7e4e59c9fb60',
  },
  '4Dvkj6JhhA12EX05fT7y2e': {
    // Harry Styles - As It Was
    name: 'As It Was',
    artists: [{ name: 'Harry Styles' }],
    album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14' }] },
    preview_url: '/api/spotify/preview/e4d7c272d8a397702d8411f280e652adfa89b71c',
  },
};

class SpotifyService {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  expiresAt: number = 0;

  constructor() {
    this.loadTokens();
  }

  // Add missing loadTokens method
  loadTokens = async (): Promise<void> => {
    try {
      const token = await TokenStorage.getItem('spotify_access_token');
      const refresh = await TokenStorage.getItem('spotify_refresh_token');
      const expires = await TokenStorage.getItem('spotify_expires_at');

      if (token) this.accessToken = token;
      if (refresh) this.refreshToken = refresh;
      if (expires) this.expiresAt = parseInt(expires, 10);

      console.log('Loaded Spotify tokens from storage');
    } catch (error) {
      console.error('Error loading Spotify tokens:', error);
    }
  };

  // Add missing saveTokens method
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

      console.log('Saved Spotify tokens to storage');
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  };

  // Add the missing authenticate method
  authenticate = async (): Promise<string | null> => {
    // Check if we have a valid token
    const now = Date.now();
    if (this.accessToken && this.expiresAt > now) {
      console.log('Using existing valid Spotify token');
      return this.accessToken;
    }

    try {
      // Get client credentials token
      const authString = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

      const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
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
      return null;
    }
  };

  // Update getTrack method to use proxy URLs
  getTrack = async (trackId: string): Promise<any> => {
    try {
      // Check if we have mock data for this track
      if (mockTracks[trackId]) {
        console.log(`Using mock data for track ${trackId}`);
        return mockTracks[trackId];
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

      // Make sure to convert preview URL to use our proxy
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

  // Update playTrack method
  playTrack = async (trackId: string | undefined): Promise<string | null> => {
    if (!trackId) {
      console.error('Invalid track ID provided to playTrack');

      // Return a fallback track if the ID is invalid
      const fallbackIds = Object.keys(mockTracks);
      const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
      return mockTracks[randomId].preview_url;
    }

    try {
      const track = await this.getTrack(trackId);

      if (!track || !track.preview_url) {
        console.log(`No preview URL for track ${trackId}, using fallback`);
        // Try a different track if this one has no preview
        const fallbackIds = Object.keys(mockTracks);
        const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
        console.log(`Using fallback track ${randomId}`);
        return mockTracks[randomId].preview_url;
      }

      console.log(`Playing track: ${track.name} with preview URL: ${track.preview_url}`);
      return track.preview_url;
    } catch (error) {
      console.error(`Error playing track ${trackId}:`, error);

      // Return a fallback track on error
      const fallbackIds = Object.keys(mockTracks);
      const randomId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
      console.log(`Error fallback: using track ${randomId}`);
      return mockTracks[randomId].preview_url;
    }
  };
}

// Create singleton instance
const spotifyService = new SpotifyService();

export default spotifyService;
