import axios from 'axios';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

console.log('Spotify client ID available:', !!CLIENT_ID);

const REDIRECT_URI = 'http://localhost:3000/callback';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'streaming',
  'user-modify-playback-state'
];

// Helper function for base64 encoding
function base64Encode(str: string): string {
  return btoa(str);
}

// Web storage implementation
const TokenStorage = {
  async setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }
};

interface SpotifyTrack {
  id: string;
  name: string;
  preview_url: string | null;
  album?: {
    id: string;
    name: string;
    images?: { url: string }[];
  };
}

interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
}

class SpotifyService {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  expiresAt: number = 0;
  audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.loadTokens();
    // Create audio element for web playback
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
    }
  }

  loadTokens = async (): Promise<void> => {
    try {
      this.accessToken = await TokenStorage.getItem('spotify_access_token');
      this.refreshToken = await TokenStorage.getItem('spotify_refresh_token');
      const expiresAtStr = await TokenStorage.getItem('spotify_expires_at');
      this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
    } catch (error) {
      console.error('Error loading Spotify tokens:', error);
    }
  }

  saveTokens = async (): Promise<void> => {
    try {
      if (this.accessToken) {
        await TokenStorage.setItem('spotify_access_token', this.accessToken);
      }
      if (this.refreshToken) {
        await TokenStorage.setItem('spotify_refresh_token', this.refreshToken);
      }
      await TokenStorage.setItem('spotify_expires_at', this.expiresAt.toString());
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  }

  authenticate = async (): Promise<string | null> => {
    try {
      // First, try to load existing tokens
      await this.loadTokens();

      // Check if we already have a valid token
      if (this.accessToken && this.expiresAt > Date.now()) {
        console.log('Using existing valid Spotify token');
        return this.accessToken;
      }

      // Try to refresh the token if we have a refresh token
      if (this.refreshToken) {
        try {
          console.log('Attempting to refresh Spotify token');
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log('Spotify token refreshed successfully');
            return this.accessToken;
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }

      // Fall back to client credentials (limited access)
      console.log('Getting new client credentials token for Spotify');
      const token = await this.getClientCredentialsToken();
      if (token) {
        console.log('Got new Spotify client credentials token');
      } else {
        console.error('Failed to get Spotify client credentials token');
      }
      return token;
    } catch (error) {
      console.error('Spotify authentication failed:', error);
      throw error;
    }
  }

  getClientCredentialsToken = async (): Promise<string | null> => {
    try {
      // For web, we'll need to encode manually or use btoa
      const auth = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + (response.data.expires_in * 1000);
      await this.saveTokens();

      return this.accessToken;
    } catch (error) {
      console.error('Error getting client credentials token:', error);
      return null;
    }
  }

  refreshAccessToken = async (): Promise<boolean> => {
    try {
      if (!this.refreshToken) return false;

      const auth = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + (response.data.expires_in * 1000);

      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }

      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  getTrack = async (trackId: string): Promise<SpotifyTrack | null> => {
    if (!trackId) return null;
    await this.authenticate();

    try {
      const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching track ${trackId}:`, error);
      return null;
    }
  }

  searchTracks = async (query: string, limit = 10) => {
    await this.authenticate();

    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching tracks:', error);
      return null;
    }
  }

  // Add this general-purpose GET method for Spotify API endpoints
  get = async <T = any>(endpoint: string): Promise<T | null> => {
    await this.authenticate();

    try {
      const response = await axios.get<T>(`https://api.spotify.com/v1/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  // Then make sure the playTrack method uses it properly
  playTrack = async (trackId: string): Promise<string | null> => {
    try {
      await this.authenticate();

      // Clean track ID if needed
      const cleanId = trackId.includes(':') ? trackId.split(':').pop() || trackId : trackId;

      // Get track details
      const trackData = await this.getTrack(cleanId);

      if (trackData) {
        console.log(`Track found: ${trackData.name}, preview URL: ${trackData.preview_url}`);
      }

      if (!trackData || !trackData.preview_url) {
        console.log(`No preview URL available for track ID: ${trackId}`);

        // Try to get preview from the album instead
        if (trackData?.album?.id) {
          console.log(`Attempting to get album tracks for alternative preview`);
          try {
            const albumTracks = await this.get<SpotifyAlbumTracksResponse>(`albums/${trackData.album.id}/tracks`);

            // Find an alternative track with preview_url
            if (albumTracks && albumTracks.items) {
              const trackWithPreview = albumTracks.items.find(track => track.preview_url);
              if (trackWithPreview) {
                console.log(`Found alternative preview from same album: ${trackWithPreview.name}`);
                return trackWithPreview.preview_url;
              }
            }
          } catch (albumError) {
            console.error('Error fetching album tracks:', albumError);
          }
        }

        console.log(`No playable source available for track: ${trackData?.name || trackId}`);
        return null;
      }

      return trackData.preview_url;
    } catch (error) {
      console.error('Error playing track:', error);
      return null;
    }
  }

  pausePlayback = async (): Promise<boolean> => {
    // This would normally use the Spotify API to pause,
    // but since we're using the Audio API for previews, 
    // this is handled in the playlistService
    return true;
  }

  resumePlayback = async (): Promise<boolean> => {
    // This would normally use the Spotify API to resume,
    // but since we're using the Audio API for previews, 
    // this is handled in the playlistService
    return true;
  }

  searchArtists = async (query: string) => {
    await this.authenticate();

    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching artists:', error);
      return null;
    }
  }

  getArtistTopTracks = async (artistId: string | undefined) => {
    if (!artistId) return null;
    await this.authenticate();

    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching artist top tracks:', error);
      return null;
    }
  }
}

const spotifyService = new SpotifyService();
export default spotifyService;