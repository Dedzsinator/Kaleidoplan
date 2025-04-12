const express = require('express');
const router = express.Router();
const { authenticateFirebaseToken } = require('../middleware/auth');
const eventsController = require('../controllers/events.controller');

// Protected routes (require authentication)
router.use(authenticateFirebaseToken);
router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', eventsController.createEvent);
router.put('/:id', eventsController.updateEvent);
router.delete('/:id', eventsController.deleteEvent);

module.exports = router;