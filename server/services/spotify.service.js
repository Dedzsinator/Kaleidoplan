// Spotify service for interacting with Spotify API
import axios from 'axios';

const { encode: base64Encode } = require('base-64');

const { SPOTIFY_CONFIG, SPOTIFY_ENDPOINTS } = require('../config/spotify');

/**
 * Get Spotify authentication token using client credentials
 */
const getAuthToken = async () => {
  try {
    const authHeader = `Basic ${base64Encode(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`)}`;

    const response = await axios.post(
      SPOTIFY_ENDPOINTS.token,
      new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Spotify auth error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Exchange authorization code for access and refresh tokens
 */
const getTokenFromCode = async (code, redirectUri) => {
  try {
    const authHeader = `Basic ${base64Encode(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`)}`;

    const response = await axios.post(
      SPOTIFY_ENDPOINTS.token,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Spotify code exchange error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Refresh an access token using a refresh token
 */
const refreshToken = async (refreshToken) => {
  try {
    const authHeader = `Basic ${base64Encode(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`)}`;

    const response = await axios.post(
      SPOTIFY_ENDPOINTS.token,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Spotify token refresh error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Create a Spotify API client with the given access token
 */
const createSpotifyClient = (accessToken) => {
  return axios.create({
    baseURL: SPOTIFY_ENDPOINTS.api,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Generate the authorization URL for Spotify OAuth flow
 */
const getAuthorizationUrl = (state) => {
  const scopesStr = SPOTIFY_CONFIG.scopes.join(' ');
  const queryParams = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: SPOTIFY_CONFIG.redirectUri,
    scope: scopesStr,
    state: state || Math.random().toString(36).substring(7),
  });

  return `${SPOTIFY_ENDPOINTS.authorize}?${queryParams.toString()}`;
};

module.exports = {
  getAuthToken,
  getTokenFromCode,
  refreshToken,
  createSpotifyClient,
  getAuthorizationUrl,
};
