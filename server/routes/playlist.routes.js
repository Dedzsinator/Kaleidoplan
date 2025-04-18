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
 * Get playlist by ID - no authentication required
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Getting playlist with ID: ${id}`);

    if (id.startsWith('pl-temp-') || id.startsWith('pl-demo-')) {
      console.log(`Creating mock playlist for temporary ID: ${id}`);
      
      // VERIFIED working track IDs with previews
      const trackSelection = [
        "7ouMYWpwJ422jRcDASZB7P", // Drake - God's Plan
        "0e7ipj03S05BNilyu5bRzt", // Taylor Swift - Cruel Summer
        "1zi7xx7UVEFkmKfv06H8x0", // Drake & 21 Savage - Rich Flex
        "0V3wPSX9ygBnCm8psDIegu", // Taylor Swift - Anti-Hero
        "4Dvkj6JhhA12EX05fT7y2e" // Harry Styles - As It Was
      ];
      
      // Select 3 random tracks from the selection
      const shuffledTracks = [...trackSelection].sort(() => 0.5 - Math.random());
      const selectedTracks = shuffledTracks.slice(0, 3);
      
      // Create the mock playlist with valid track IDs
      const mockPlaylist = {
        _id: id,
        playlistId: id,
        name: id.startsWith('pl-demo') 
          ? `Demo Playlist ${id.split('-')[2]}`
          : `Playlist ${id.split('-')[2]}`,
        description: 'Auto-generated playlist with popular tracks',
        tracks: selectedTracks,
        public: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return res.json(mockPlaylist);
    }

    // For regular playlist IDs, try to find in database
    let playlist;
    try {
      // First attempt to find by _id as ObjectId
      playlist = await Playlist.findOne({
        $or: [
          { _id: id }, 
          { playlistId: id }
        ]
      }).populate('eventId', 'name startDate endDate');
    } catch (error) {
      // If ObjectId cast fails, try string matching only on playlistId
      console.log(`ID cast failed, trying string match: ${error.message}`);
      playlist = await Playlist.findOne({ playlistId: id })
        .populate('eventId', 'name startDate endDate');
    }

    if (!playlist) {
      console.log(`Playlist not found: ${id}`);
      return res.status(404).json({ error: 'Playlist not found' });
    }

    console.log(`Found playlist: ${playlist.name}`);
    res.json(playlist);
  } catch (error) {
    console.error(`Error getting playlist: ${error.message}`);
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
