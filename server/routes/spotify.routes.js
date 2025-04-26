const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');
const spotifyController = require('../controllers/spotify.controller');
const authMiddleware = require('../middleware/auth');

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

    // Set more extensive CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');

    // Set audio content type explicitly
    res.set('Content-Type', 'audio/mpeg');

    // If we have content length, set it
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    // Set caching headers to improve performance
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for a day
    res.set('Accept-Ranges', 'bytes');

    // Send the buffer
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

// Existing routes...
module.exports = router;
