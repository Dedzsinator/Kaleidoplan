// Spotify integration routes
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotify.controller');
const { authenticateFirebaseToken, optionalAuthentication } = require('../middleware/auth');

// Public routes
router.get('/auth', spotifyController.getLoginUrl);
router.get('/callback', optionalAuthentication, spotifyController.handleCallback);
router.post('/refresh', spotifyController.refreshToken);
router.get('/search', spotifyController.searchTracks);

// Protected routes
router.use(authenticateFirebaseToken);
router.get('/playlist/:eventId', spotifyController.getEventPlaylist);
router.post('/playlist/:eventId', spotifyController.createEventPlaylist);
router.post('/playlist/:playlistId/tracks', spotifyController.addTrackToPlaylist);
router.delete('/playlist/:playlistId/tracks/:trackId', spotifyController.removeTrackFromPlaylist);

module.exports = router;