const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotify.controller');
const authMiddleware = require('../middleware/auth');

// Protect all routes - require authentication
router.use(authMiddleware.verifyToken);

// Spotify API routes
router.get('/search', spotifyController.searchTracks);
router.get('/playlists', spotifyController.getUserPlaylists);
router.post('/playlists', spotifyController.createPlaylist);
router.get('/tracks/:id', spotifyController.getTrackDetails);

module.exports = router;
