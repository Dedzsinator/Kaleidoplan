// Playlist management routes
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Playlist = require('../models/playlist.model');

// All playlist routes require authentication
router.use(authMiddleware.verifyToken);

/**
 * Get all playlists
 */
router.get('/', async (req, res, next) => {
  try {
    const { eventId, limit = 50, page = 1 } = req.query;

    // Build query
    const query = {};
    if (eventId) {
      query.eventId = eventId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get playlists
    const playlists = await Playlist.find(query)
      .populate('eventId', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalPlaylists = await Playlist.countDocuments(query);

    res.json({
      playlists,
      pagination: {
        total: totalPlaylists,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalPlaylists / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get playlist by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findOne({
      $or: [{ _id: id }, { playlistId: id }],
    }).populate('eventId', 'name startDate endDate');

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

/**
 * Create new playlist
 */
router.post('/', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { playlistId, name, description, spotifyId, spotifyUri, coverImageUrl, tracks, eventId, public } = req.body;

    if (!name || !playlistId) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['name', 'playlistId'],
      });
    }

    // Check if playlist already exists
    const existingPlaylist = await Playlist.findOne({
      $or: [{ playlistId }, { spotifyId: spotifyId || '' }],
    });

    if (existingPlaylist) {
      return res.status(400).json({ error: 'Playlist with this ID already exists' });
    }

    // Create playlist
    const playlist = new Playlist({
      playlistId,
      name,
      description,
      spotifyId,
      spotifyUri,
      coverImageUrl,
      tracks: tracks || [],
      eventId,
      public: public || false,
      createdBy: req.user.uid,
    });

    await playlist.save();

    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
});

/**
 * Update playlist
 */
router.put('/:id', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, spotifyId, spotifyUri, coverImageUrl, tracks, eventId, public } = req.body;

    // Find playlist
    const playlist = await Playlist.findOne({
      $or: [{ _id: id }, { playlistId: id }],
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Update fields
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (spotifyId) playlist.spotifyId = spotifyId;
    if (spotifyUri) playlist.spotifyUri = spotifyUri;
    if (coverImageUrl) playlist.coverImageUrl = coverImageUrl;
    if (tracks) playlist.tracks = tracks;
    if (eventId) playlist.eventId = eventId;
    if (public !== undefined) playlist.public = public;
    playlist.updatedBy = req.user.uid;

    await playlist.save();

    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete playlist
 */
router.delete('/:id', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete playlist
    const playlist = await Playlist.findOneAndDelete({
      $or: [{ _id: id }, { playlistId: id }],
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
