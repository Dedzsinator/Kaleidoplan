const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Playlist = require('../models/playlist.model');
const Event = require('../models/event.model');
const mongoose = require('mongoose');

/**
 * Get all playlists
 */
router.get('/', authMiddleware.verifyToken, async (req, res, next) => {
  try {
    const { eventId, limit = 50, page = 1 } = req.query;
    const query = {};
    if (eventId) {
      query.eventId = eventId; // Assuming eventId in playlist links to event._id
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const playlists = await Playlist.find(query)
      .populate('eventId', 'name startDate endDate') // Populate if eventId is a ref to Event's _id
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Build a query that doesn't try to cast non-ObjectId strings to ObjectId
    const query = { playlistId: id };

    // Only add _id to the query if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { playlistId: id }];
    }

    const playlist = await Playlist.findOne(query);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let event = null;
    if (playlist.eventId) {
      try {
        // For numeric IDs (like 1, 2, 3), look up by the regular 'id' field
        if (typeof playlist.eventId === 'number' || !isNaN(Number(playlist.eventId))) {
          // Convert to number for consistent lookup
          const numericId = Number(playlist.eventId);
          event = await Event.findOne({ id: numericId });
        }

        // Try string ID if numeric lookup fails
        if (!event && typeof playlist.eventId === 'string') {
          event = await Event.findOne({ id: playlist.eventId });
        }

        // Last resort - try ObjectId lookup but only if it's a valid ObjectId format
        if (!event && mongoose.Types.ObjectId.isValid(playlist.eventId)) {
          event = await Event.findOne({ _id: playlist.eventId });
        }
      } catch (eventError) {
        console.warn(`Error finding event: ${eventError.message}`);
      }
    }

    // Include event data in response if found
    const response = playlist.toObject();
    if (event) {
      response.event = event;
      response.eventId = {
        _id: event._id,
        id: event.id || event._id.toString(),
      };
    } else {
    }

    return res.json(response);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// POST create new playlist - use playlistId instead of _id
router.post('/', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const {
      playlistId, // Changed from _id to playlistId
      name,
      description,
      spotifyId,
      spotifyUri,
      coverImageUrl,
      tracks,
      eventId,
      public: isPublic,
    } = req.body;

    if (!name || !playlistId) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['playlistId', 'name'],
      });
    }

    // Check if playlist with this playlistId already exists
    let existingPlaylist = await Playlist.findOne({ playlistId });
    if (existingPlaylist) {
      return res.status(400).json({ error: `Playlist with playlistId '${playlistId}' already exists.` });
    }

    const newPlaylistDoc = new Playlist({
      playlistId, // Use playlistId from req.body
      name,
      description,
      spotifyId,
      spotifyUri,
      coverImageUrl,
      tracks: tracks || [],
      eventId,
      public: typeof isPublic === 'boolean' ? isPublic : false,
      userId: req.user.uid,
    });

    await newPlaylistDoc.save();
    res.status(201).json(newPlaylistDoc);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Playlist with this ID already exists.' });
    }
    console.error(`Error creating playlist: ${error.message}`);
    next(error);
  }
});

// PUT update playlist by playlistId
router.put('/:id', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params; // This is the playlistId
    const { name, description, spotifyId, spotifyUri, coverImageUrl, tracks, eventId, public: isPublic } = req.body;

    const playlist = await Playlist.findOne({ playlistId: id });

    if (!playlist) {
      return res.status(404).json({ error: `Playlist not found with playlistId ${id}` });
    }

    // Update fields
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (spotifyId !== undefined) playlist.spotifyId = spotifyId;
    if (spotifyUri !== undefined) playlist.spotifyUri = spotifyUri;
    if (coverImageUrl !== undefined) playlist.coverImageUrl = coverImageUrl;
    if (tracks) playlist.tracks = tracks;
    if (eventId) playlist.eventId = eventId;
    if (typeof isPublic === 'boolean') playlist.public = isPublic;

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error(`Error updating playlist playlistId '${req.params.id}': ${error.message}`);
    next(error);
  }
});

// DELETE playlist by playlistId
router.delete('/:id', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params; // This is the playlistId

    const playlist = await Playlist.findOneAndDelete({ playlistId: id });

    if (!playlist) {
      return res.status(404).json({ error: `Playlist not found with playlistId ${id}` });
    }

    res.json({ message: 'Playlist deleted successfully', playlistId: id });
  } catch (error) {
    console.error(`Error deleting playlist playlistId '${req.params.id}': ${error.message}`);
    next(error);
  }
});
module.exports = router;
