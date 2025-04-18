const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const eventsController = require('../controllers/events.controller');

// Protected routes (require authentication)
router.use(authMiddleware.verifyToken); // Use verifyToken instead of authenticateFirebaseToken
router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', authMiddleware.requireOrganizerOrAdmin, eventsController.createEvent);
router.put('/:id', authMiddleware.checkEventOwnership, eventsController.updateEvent);
router.delete('/:id', authMiddleware.checkEventOwnership, eventsController.deleteEvent);

module.exports = router;
