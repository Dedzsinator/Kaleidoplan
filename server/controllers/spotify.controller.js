const axios = require('axios');
const User = require('../models/user.model');
const SpotifyPlaylist = require('../models/playlist.model'); // Create this model if needed

// Spotify API configuration
const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Get access token for Spotify API
const getSpotifyAccessToken = async () => {
  try {
    // For demo purposes - in production, use proper OAuth flow with refresh tokens
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'client_credentials'
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw new Error('Failed to get Spotify access token');
  }
};

// Search tracks on Spotify
exports.searchTracks = async (req, res, next) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const accessToken = await getSpotifyAccessToken();
    
    const response = await spotifyApi.get('/search', {
      params: {
        q: query,
        type: 'track',
        limit
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Spotify search error:', error);
    next(error);
  }
};

// Get user playlists
exports.getUserPlaylists = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    // Get user's playlists from our database
    const playlists = await SpotifyPlaylist.find({ userId: uid })
      .sort({ createdAt: -1 });
      
    res.status(200).json(playlists);
  } catch (error) {
    next(error);
  }
};

// Create a new playlist
exports.createPlaylist = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { name, description, tracks } = req.body;
    
    if (!name || !tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Name and tracks array are required' });
    }
    
    // Create playlist in our database
    const playlist = new SpotifyPlaylist({
      userId: uid,
      name,
      description: description || '',
      tracks,
      public: true
    });
    
    await playlist.save();
    
    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
};

// Get track details
exports.getTrackDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Track ID is required' });
    }
    
    const accessToken = await getSpotifyAccessToken();
    
    const response = await spotifyApi.get(`/tracks/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    res.status(200).json(response.data);
  } catch (error) {
    next(error);
  }
};