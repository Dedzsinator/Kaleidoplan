import http from 'http';
import https from 'https';

import axios from 'axios';
import express from 'express';

import spotifyController from '../controllers/spotify.controller';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/preview/:previewId', async (req, res) => {
  try {
    const previewId = req.params.previewId;
    const previewUrl = `https://p.scdn.co/mp3-preview/${previewId}`;

    // Create optimized HTTP agents with keep-alive
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });

    // Fetch the audio file
    const response = await axios({
      method: 'get',
      url: previewUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      httpAgent,
      httpsAgent,
      maxRedirects: 5,
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.set('Content-Type', 'audio/mpeg');

    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Accept-Ranges', 'bytes');

    return res.send(response.data);
  } catch (error) {
    console.error(`Error proxying Spotify preview:`, error);
    return res.status(500).json({
      error: 'Failed to fetch audio preview',
      details: error.message,
      url: `https://p.scdn.co/mp3-preview/${req.params.previewId}`,
    });
  }
});

router.get('/search', spotifyController.searchTracks);
router.get('/playlists', authMiddleware.requireAuth, spotifyController.getUserPlaylists);
router.post('/playlists', authMiddleware.requireAuth, spotifyController.createPlaylist);
router.get('/tracks/:id', spotifyController.getTrackDetails);

module.exports = router;
