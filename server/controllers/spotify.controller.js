// Spotify integration controller
const crypto = require('crypto');
const spotifyConfig = require('../config/spotify');
const Playlist = require('../models/playlist.model');
const User = require('../models/user.model');
const Event = require('../models/event.model');

/**
 * Get Spotify login URL
 */
const getLoginUrl = (req, res) => {
  try {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Save state in session or Redis for verification later
    req.session = req.session || {};
    req.session.spotifyAuthState = state;
    
    // Generate authorization URL
    const authUrl = spotifyConfig.getAuthorizationUrl(state);
    
    res.json({ loginUrl: authUrl });
  } catch (error) {
    console.error('Spotify login error:', error);
    res.status(500).json({ error: 'Failed to generate Spotify login URL' });
  }
};

/**
 * Handle Spotify callback
 */
const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state to prevent CSRF attacks
    if (!req.session || state !== req.session.spotifyAuthState) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }
    
    // Exchange code for access token
    const tokenData = await spotifyConfig.exchangeCodeForToken(code);
    
    // Store tokens in database for the user
    if (req.user) {
      await User.findOneAndUpdate(
        { firebaseUid: req.user.uid },
        {
          'spotifyTokens.accessToken': tokenData.access_token,
          'spotifyTokens.refreshToken': tokenData.refresh_token,
          'spotifyTokens.expiresAt': new Date(Date.now() + tokenData.expires_in * 1000)
        }
      );
    }
    
    // Return tokens or redirect
    res.json({
      message: 'Authentication successful',
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in
    });
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Refresh token
    const tokenData = await spotifyConfig.refreshAccessToken(refreshToken);
    
    // Update token in database if user is authenticated
    if (req.user) {
      await User.findOneAndUpdate(
        { firebaseUid: req.user.uid },
        {
          'spotifyTokens.accessToken': tokenData.access_token,
          'spotifyTokens.expiresAt': new Date(Date.now() + tokenData.expires_in * 1000)
        }
      );
    }
    
    res.json({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Search tracks on Spotify
 */
const searchTracks = async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Get client credentials token (no user authentication needed)
    const tokenData = await spotifyConfig.getClientCredentialsToken();
    
    // Create API client
    const spotifyApi = spotifyConfig.createApiClient(tokenData.access_token);
    
    // Search tracks
    const response = await spotifyApi.get('/search', {
      params: {
        q: query,
        type: 'track',
        limit: Math.min(50, Number(limit))
      }
    });
    
    res.json(response.data.tracks);
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
};

/**
 * Get event playlist
 */
const getEventPlaylist = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Find playlist for event
    const playlist = await Playlist.findOne({ eventId });
    if (!playlist) {
      return res.status(404).json({ error: 'No playlist found for this event' });
    }
    
    // Return playlist data
    res.json(playlist);
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Failed to get event playlist' });
  }
};

/**
 * Create or update event playlist
 */
const createEventPlaylist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { playlistId, name, description, tracks, spotifyId, spotifyUri, coverImageUrl } = req.body;
    
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if playlist already exists
    let playlist = await Playlist.findOne({ eventId });
    
    if (playlist) {
      // Update existing playlist
      playlist.name = name || playlist.name;
      playlist.description = description || playlist.description;
      playlist.spotifyId = spotifyId || playlist.spotifyId;
      playlist.spotifyUri = spotifyUri || playlist.spotifyUri;
      playlist.coverImageUrl = coverImageUrl || playlist.coverImageUrl;
      playlist.tracks = tracks || playlist.tracks;
      playlist.updatedBy = req.user.uid;
      
      await playlist.save();
    } else {
      // Create new playlist
      playlist = new Playlist({
        playlistId: playlistId || `event-${eventId}`,
        name: name || `${event.name} Playlist`,
        description,
        spotifyId,
        spotifyUri,
        coverImageUrl,
        tracks: tracks || [],
        eventId,
        createdBy: req.user.uid
      });
      
      await playlist.save();
      
      // Update event with playlist ID
      await Event.findByIdAndUpdate(eventId, { playlistId: playlist.playlistId });
    }
    
    res.json(playlist);
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create event playlist' });
  }
};

/**
 * Add track to playlist
 */
const addTrackToPlaylist = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { track } = req.body;
    
    if (!track || !track.spotifyId) {
      return res.status(400).json({ error: 'Valid track data is required' });
    }
    
    // Find playlist
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Check if track already exists
    const trackExists = playlist.tracks.some(t => t.spotifyId === track.spotifyId);
    if (trackExists) {
      return res.status(400).json({ error: 'Track already exists in playlist' });
    }
    
    // Add track
    playlist.tracks.push(track);
    playlist.updatedBy = req.user.uid;
    
    await playlist.save();
    
    res.json(playlist);
  } catch (error) {
    console.error('Add track error:', error);
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
};

/**
 * Remove track from playlist
 */
const removeTrackFromPlaylist = async (req, res) => {
  try {
    const { playlistId, trackId } = req.params;
    
    // Find playlist
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Remove track
    const initialLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(track => track.spotifyId !== trackId);
    
    if (playlist.tracks.length === initialLength) {
      return res.status(404).json({ error: 'Track not found in playlist' });
    }
    
    playlist.updatedBy = req.user.uid;
    await playlist.save();
    
    res.json(playlist);
  } catch (error) {
    console.error('Remove track error:', error);
    res.status(500).json({ error: 'Failed to remove track from playlist' });
  }
};

module.exports = {
  getLoginUrl,
  handleCallback,
  refreshToken,
  searchTracks,
  getEventPlaylist,
  createEventPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist
};