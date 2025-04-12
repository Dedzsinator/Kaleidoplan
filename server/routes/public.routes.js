// Public API endpoints that don't require authentication
const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { optionalAuthentication } = require('../middleware/auth');

// Use optional authentication to get user context if available
router.use(optionalAuthentication);

// Public event endpoints
router.get('/events', async (req, res, next) => {
  try {
    // Modify the query to only show public/published events
    req.query = {
      ...req.query,
      status: req.query.status || ['upcoming', 'ongoing']
    };
    
    // Use the standard events controller
    await eventsController.getAllEvents(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get('/events/:id', async (req, res, next) => {
  try {
    // Use the standard event controller but limit sensitive data
    await eventsController.getEventById(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Playlist endpoints (public access)
router.get('/playlists/:id', (req, res) => {
  // Public playlist endpoint
  // Implementation details would go here
});

module.exports = router;