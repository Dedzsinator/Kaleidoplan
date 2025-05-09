// Playlist management routes
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Playlist = require('../models/playlist.model');
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

// GET playlist by its ID (e.g., "pl1")
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  console.log(`[Playlist Route] GET /:id - Received ID for playlistId: "${id}" (Type: ${typeof id})`);

  console.log(`[Playlist Route] Mongoose connection state: ${mongoose.connection.readyState} (1 means connected)`);
  console.log(`[Playlist Route] Attempting to query with Model Name: ${Playlist.modelName}`);
  console.log(`[Playlist Route] Target Collection Name (Mongoose default): ${Playlist.collection.name}`);

  try {
    // Query using playlistId field instead of _id
    console.log(`[Playlist Route] Executing: Playlist.findOne({ playlistId: "${id}" })`);
    const playlist = await Playlist.findOne({ playlistId: id });

    if (!playlist) {
      console.log(`[Playlist Route] Playlist.findOne({ playlistId: "${id}" }) returned null. Document not found.`);
      return res.status(404).json({ error: `Playlist not found with playlistId ${id}` });
    }

    console.log(`[Playlist Route] Successfully found playlist with playlistId: "${id}"`);

    // Try to populate, but handle errors gracefully
    try {
      if (playlist.eventId) {
        console.log(
          `[Playlist Route] Attempting to populate eventId: "${playlist.eventId}" (${typeof playlist.eventId})`,
        );

        // Only populate if eventId is an ObjectId or can be cast to one
        const Event = mongoose.model('Event');
        const event = await Event.findOne({
          $or: [{ _id: playlist.eventId }, { id: playlist.eventId }],
        });

        if (event) {
          console.log(`[Playlist Route] Found related event: "${event.name}"`);
          // Manually add the populated event data
          playlist._doc.eventId = {
            _id: event._id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
          };
        } else {
          console.log(`[Playlist Route] Related event with ID "${playlist.eventId}" not found`);
        }
      }
    } catch (populateError) {
      console.error(`[Playlist Route] Error populating eventId: ${populateError.message}`);
      // Continue without population - we'll return the unpopulated playlist
    }

    // Return playlist even if population failed
    res.json(playlist);
  } catch (error) {
    console.error(
      `[Playlist Route] Error in GET /playlists/${id} (querying by playlistId): ${error.message}`,
      error.stack,
    );
    next(error);
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
