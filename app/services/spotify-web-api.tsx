import { Platform } from 'react-native';
import SpotifyWebApi from 'spotify-web-api-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import Constants from 'expo-constants';
// Import environment variables directly
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '@env';

// Use environment variables directly
const CLIENT_ID = SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = SPOTIFY_CLIENT_SECRET;

// Log check if credentials loaded (remove in production)
if (!CLIENT_ID) {
  console.warn('Spotify Client ID missing. Check .env file is properly set up.');
}

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

// Set up AuthSession for native app auth flow
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

class SpotifyService {
  spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  isAuthenticated: boolean = false;
  authenticationPromise: Promise<boolean> | null = null;

  constructor() {
    this.spotifyApi = new SpotifyWebApi();
    this.isAuthenticated = false;
    console.log('Spotify service initialized with client ID:', CLIENT_ID?.substring(0, 5) + '...');
  }

  // Rest of your code remains the same
  async authenticate() {
    if (this.isAuthenticated) return true;
    if (this.authenticationPromise) return this.authenticationPromise;

    this.authenticationPromise = this._authenticate();
    return this.authenticationPromise;
  }

  async _authenticate() {
    try {
      // Check if we have stored token
      const tokenData = await this._getStoredTokenData();

      if (tokenData && tokenData.expiresAt > Date.now()) {
        // Token is still valid
        console.log('Using stored Spotify token');
        this.spotifyApi.setAccessToken(tokenData.accessToken);
        this.isAuthenticated = true;
        return true;
      }

      // Need to get a new token
      console.log('Getting new Spotify token');
      const newTokenData = await this._getNewToken();
      if (newTokenData) {
        this.spotifyApi.setAccessToken(newTokenData.accessToken);
        this.isAuthenticated = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Spotify authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    } finally {
      this.authenticationPromise = null;
    }
  }

  async _getNewToken() {
    if (Platform.OS === 'web') {
      // Web-specific auth flow
      return await this._getNewTokenWeb();
    } else {
      // Native auth flow
      return await this._getNewTokenNative();
    }
  }

  async _getNewTokenWeb() {
    const authEndpoint = 'https://accounts.spotify.com/authorize';
    const responseType = 'token';

    const authUrl =
      `${authEndpoint}?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
      `&response_type=${responseType}`;

    // Create a hidden iframe for the auth flow
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Create popup window for auth
    const popup = window.open(authUrl, 'spotify-auth-window', 'width=800,height=600');

    // Monitor for redirect with hash params
    return new Promise((resolve) => {
      const checkPopup = setInterval(() => {
        try {
          // Check if popup was closed or redirected to our redirect URI
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            document.body.removeChild(iframe);
            resolve(null);
            return;
          }

          const currentUrl = popup.location.href;
          if (currentUrl.startsWith(REDIRECT_URI)) {
            clearInterval(checkPopup);
            popup.close();

            // Parse the hash parameters from the URL
            const hashParams = new URLSearchParams(
              currentUrl.split('#')[1] || ''
            );

            const access_token = hashParams.get('access_token');
            const expires_in = parseInt(hashParams.get('expires_in') || '0', 10);

            if (access_token && expires_in) {
              const tokenData = {
                accessToken: access_token,
                expiresAt: Date.now() + (expires_in * 1000),
              };

              this._storeTokenData(tokenData);
              document.body.removeChild(iframe);
              resolve(tokenData);
            } else {
              document.body.removeChild(iframe);
              resolve(null);
            }
          }
        } catch (e) {
          // This is expected due to cross-origin restrictions when checking popup.location
          // Just continue polling
        }
      }, 100);

      // Handle window message events as fallback if direct access to popup fails
      window.addEventListener('message', async (event) => {
        if (event.data?.type === 'SPOTIFY_TOKEN') {
          clearInterval(checkPopup);
          popup?.close();
          document.body.removeChild(iframe);

          const tokenData = {
            accessToken: event.data.accessToken,
            expiresAt: Date.now() + (event.data.expiresIn * 1000),
          };
          await this._storeTokenData(tokenData);
          resolve(tokenData);
        }
      });
    });
  }

  async _getNewTokenNative() {
    try {
      // Native auth flow using Expo AuthSession
      const discovery = {
        authorizationEndpoint: 'https://accounts.spotify.com/authorize',
        tokenEndpoint: 'https://accounts.spotify.com/api/token',
      };

      console.log('Starting native Spotify auth flow');
      console.log('CLIENT_ID:', CLIENT_ID?.substring(0, 5) + '...');
      console.log('REDIRECT_URI:', REDIRECT_URI);

      const authRequest = await AuthSession.makeAuthorizationRequest(
        {
          clientId: CLIENT_ID,
          scopes: SCOPES,
          redirectUri: REDIRECT_URI,
          responseType: AuthSession.ResponseType.Token,
          extraParams: {
            show_dialog: 'true' // Force login dialog
          }
        },
        discovery
      );

      const authResult = await AuthSession.startAsync({ authRequest });
      console.log('Auth result type:', authResult.type);

      if (authResult.type === 'success') {
        const { access_token, expires_in } = authResult.params;
        console.log('Got access token, expires in:', expires_in);

        const tokenData = {
          accessToken: access_token,
          expiresAt: Date.now() + (expires_in * 1000),
        };

        await this._storeTokenData(tokenData);
        return tokenData;
      } else {
        console.log('Auth failed:', authResult.type);
      }

      return null;
    } catch (error) {
      console.error('Native auth error:', error);
      return null;
    }
  }

  async _storeTokenData(tokenData: { accessToken: string; expiresAt: number }) {
    await setItemAsync('spotify_token_data', JSON.stringify(tokenData));
  }

  async _getStoredTokenData() {
    const storedData = await getItemAsync('spotify_token_data');
    return storedData ? JSON.parse(storedData) : null;
  }

  async searchTracks(query: string, limit: number = 5) {
    await this.authenticate();
    return this.spotifyApi.searchTracks(query, { limit });
  }

  async getArtistTopTracks(artistId: string, country: string = 'US') {
    await this.authenticate();
    return this.spotifyApi.getArtistTopTracks(artistId, country);
  }

  async searchArtists(artistName: string, limit: number = 5) {
    await this.authenticate();
    return this.spotifyApi.searchArtists(artistName, { limit });
  }

  async playTrack(trackUri: string, deviceId?: string) {
    await this.authenticate();
    const options = deviceId ? { device_id: deviceId } : undefined;
    return this.spotifyApi.play({
      ...options,
      uris: [trackUri],
    });
  }

  async pausePlayback(deviceId?: string) {
    await this.authenticate();
    const options = deviceId ? { device_id: deviceId } : undefined;
    return this.spotifyApi.pause(options);
  }
}

export default new SpotifyService();