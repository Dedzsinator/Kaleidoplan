// Spotify API configuration
const axios = require('axios');
const { encode: base64encode } = require('base-64');
require('dotenv').config();

// Spotify API credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

/**
 * Get Spotify authorization header for client credentials flow
 */
const getClientCredentialsAuthHeader = () => {
  const auth = base64encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  return `Basic ${auth}`;
};

/**
 * Get client credentials token (app-only access)
 */
const getClientCredentialsToken = async () => {
  try {
    const response = await axios({
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        'Authorization': getClientCredentialsAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'client_credentials'
      }).toString()
    });

    return response.data;
  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    throw new Error('Failed to obtain Spotify access token');
  }
};

/**
 * Get authorization URL for user authentication
 */
const getAuthorizationUrl = (state, scopes = []) => {
  const defaultScopes = [
    'user-read-private',
    'user-read-email', 
    'playlist-read-private',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];
  
  const scopeString = [...defaultScopes, ...scopes].join(' ');
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scopeString,
    state: state
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios({
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        'Authorization': getClientCredentialsAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI
      }).toString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Spotify code exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code');
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios({
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        'Authorization': getClientCredentialsAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Spotify token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh Spotify access token');
  }
};

/**
 * Create API client with access token
 */
const createApiClient = (accessToken) => {
  return axios.create({
    baseURL: SPOTIFY_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
};

module.exports = {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_API_BASE_URL,
  getClientCredentialsToken,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  createApiClient
};