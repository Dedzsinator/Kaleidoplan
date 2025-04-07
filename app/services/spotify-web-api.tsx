import axios from 'axios';
import { encode as base64Encode } from 'base-64';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';

// Use environment variables directly
const CLIENT_ID = 'de63d9c68178463a82b0b78c1f845c1e';
const CLIENT_SECRET = 'fbb4799ce971413c96e4efc9f95c7c7c';

const REDIRECT_URI = Platform.select({
  web: 'http://localhost:19006/',
  default: 'kaleidoplan://spotify-auth',
});

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'streaming',
  'user-modify-playback-state'
];

// Simple storage implementation that works on both web and native
const TokenStorage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        // On native, we'd use SecureStore but for now just use memory
        TokenStorage[`_${key}`] = value;
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        // On native, return from memory
        return TokenStorage[`_${key}`];
      }
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }
};

class SpotifyService {
  accessToken = null;
  refreshToken = null;
  expiresAt = 0;

  constructor() {
    this.loadTokens();
  }

  loadTokens = async () => {
    try {
      this.accessToken = await TokenStorage.getItem('spotify_access_token');
      this.refreshToken = await TokenStorage.getItem('spotify_refresh_token');
      const expiresAtStr = await TokenStorage.getItem('spotify_expires_at');
      this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
    } catch (error) {
      console.error('Error loading Spotify tokens:', error);
    }
  }

  saveTokens = async () => {
    try {
      await TokenStorage.setItem('spotify_access_token', this.accessToken);
      if (this.refreshToken) {
        await TokenStorage.setItem('spotify_refresh_token', this.refreshToken);
      }
      await TokenStorage.setItem('spotify_expires_at', this.expiresAt.toString());
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  }

  authenticate = async () => {
    // Check if we already have a valid token
    if (this.accessToken && this.expiresAt > Date.now()) {
      return this.accessToken;
    }

    // Try to refresh the token if we have a refresh token
    if (this.refreshToken) {
      try {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.accessToken;
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }

    // Fall back to client credentials (limited access)
    return this.getClientCredentialsToken();
  }

  getClientCredentialsToken = async () => {
    try {
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

  refreshAccessToken = async () => {
    try {
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

  getTrack = async (trackId) => {
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

  searchTracks = async (query, limit = 10) => {
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

  // Play a track using Spotify API or fetch the preview URL
  playTrack = async (trackId) => {
    if (!trackId) return false;

    try {
      // Extract the ID if a URI was passed
      const cleanId = trackId.includes(':')
        ? trackId.split(':').pop()
        : trackId;

      await this.authenticate();
      console.log(`Attempting to play track: ${cleanId}`);

      // Get the track details including the preview URL
      const track = await this.getTrack(cleanId);

      if (!track) {
        console.error('Track not found');
        return false;
      }

      console.log(`Track found: ${track.name}, preview URL: ${track.preview_url}`);

      // Return the preview URL which will be used by the Audio API
      if (track.preview_url) {
        return track.preview_url;
      }

      console.warn('No preview URL available for track:', track.name);
      return false;
    } catch (error) {
      console.error('Error playing track:', error);
      return false;
    }
  }

  pausePlayback = async () => {
    // This would normally use the Spotify API to pause,
    // but since we're using the Audio API for previews, 
    // this is handled in the playlistService
    return true;
  }

  resumePlayback = async () => {
    // This would normally use the Spotify API to resume,
    // but since we're using the Audio API for previews, 
    // this is handled in the playlistService
    return true;
  }
}

const spotifyService = new SpotifyService();
export default spotifyService;