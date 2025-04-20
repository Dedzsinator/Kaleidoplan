const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const authMiddleware = require('../middleware/auth');

router.get('/managed', 
  authMiddleware.verifyToken, 
  eventsController.getManagedEvents
);

router.get('/all', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData, 
  authMiddleware.requireAdmin, 
  eventsController.getAllEvents
);

// Regular event routes with parameters - must come AFTER special routes
router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData, 
  eventsController.createEvent
);
router.put('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData, 
  eventsController.updateEvent
);
router.delete('/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData, 
  eventsController.deleteEvent
);
router.get('/:id/interests', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData, 
  eventsController.getEventInterests
);

module.exports = router;
