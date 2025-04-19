const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');
const spotifyController = require('../controllers/spotify.controller');
const authMiddleware = require('../middleware/auth');

// Proxy endpoint for audio previews - NO AUTH REQUIRED
router.get('/preview/:previewId', async (req, res) => {
  try {
    const previewId = req.params.previewId;
    const previewUrl = `https://p.scdn.co/mp3-preview/${previewId}`;

    console.log(`Proxying Spotify preview: ${previewUrl}`);

    // Create optimized HTTP agents with keep-alive
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });

    // Fetch the audio file without streaming - just forward the response
    const response = await axios({
      method: 'get',
      url: previewUrl,
      responseType: 'arraybuffer', // Use arraybuffer instead of stream for more reliable proxy
      timeout: 30000,
      httpAgent,
      httpsAgent,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx status codes
    });

    // Set appropriate headers from original response
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    } else {
      res.set('Content-Type', 'audio/mpeg');
    }

    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }

    res.set('Accept-Ranges', 'bytes');
    res.set('Access-Control-Allow-Origin', '*');

    // Send the buffer directly
    return res.send(response.data);
  } catch (error) {
    console.error(`Error proxying Spotify preview:`, error);
    // Send a more detailed error response
    return res.status(500).json({
      error: 'Failed to fetch audio preview',
      details: error.message,
      url: `https://p.scdn.co/mp3-preview/${req.params.previewId}`,
    });
  }
});

// Existing routes...
module.exports = router;
