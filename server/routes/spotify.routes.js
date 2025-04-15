const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotify.controller');
const { authenticateFirebaseToken } = require('../middleware/auth');

// Protect all routes - require authentication
router.use(authenticateFirebaseToken);

// LINE 9: The issue is here - you're using an undefined controller method
// router.get('/search', spotifyController.searchTracks); 

// FIX: Replace with properly defined controller functions
router.get('/search', spotifyController.searchTracks);
router.get('/playlists', spotifyController.getUserPlaylists);
router.post('/playlists', spotifyController.createPlaylist);
router.get('/tracks/:id', spotifyController.getTrackDetails);

module.exports = router;