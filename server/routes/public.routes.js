const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Check what's available in the controller (debugging)
console.log('Public controller exports:', Object.keys(publicController));

// Define routes with proper error checking
router.get('/events', (req, res, next) => {
  if (typeof publicController.getPublicEvents === 'function') {
    return publicController.getPublicEvents(req, res, next);
  } else {
    console.error('getPublicEvents is not a function:', publicController.getPublicEvents);
    return res.status(500).json({ error: 'Route handler not implemented' });
  }
});

router.get('/events/:id', (req, res, next) => {
  if (typeof publicController.getPublicEventById === 'function') {
    return publicController.getPublicEventById(req, res, next);
  } else {
    console.error('getPublicEventById is not a function:', publicController.getPublicEventById);
    return res.status(500).json({ error: 'Route handler not implemented' });
  }
});

// Add any other public routes here...

module.exports = router;