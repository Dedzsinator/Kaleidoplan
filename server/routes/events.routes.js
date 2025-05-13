const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const authMiddleware = require('../middleware/auth');

// Make sure these image upload routes are BEFORE any JSON-parsing middleware
router.post('/images/upload', authMiddleware.verifyToken, eventsController.uploadEventImage);
router.post('/images/upload-multiple', authMiddleware.verifyToken, eventsController.uploadMultipleEventImages);

// Other routes
router.get('/managed', authMiddleware.verifyToken, eventsController.getManagedEvents);
router.get(
  '/all',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  eventsController.getAllEvents,
);

// Regular event routes with parameters - must come AFTER special routes
router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', authMiddleware.verifyToken, authMiddleware.attachUserData, eventsController.createEvent);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.attachUserData, eventsController.updateEvent);
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.attachUserData, eventsController.deleteEvent);
router.get(
  '/:id/interests',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  eventsController.getEventInterests,
);

router.post(
  '/:id/interest',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  eventsController.toggleEventInterest,
);

// Check if user is interested in an event
router.get(
  '/:id/interest',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  eventsController.checkEventInterest,
);

router.post('/image-reference', authMiddleware.verifyToken, eventsController.storeImageReference);
router.post('/image-references', authMiddleware.verifyToken, eventsController.storeMultipleImageReferences);
router.delete('/images/:publicId', authMiddleware.verifyToken, eventsController.deleteEventImage);

module.exports = router;
