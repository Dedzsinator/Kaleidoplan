const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth');

// Get current user (authenticated users only)
router.get('/me', 
  authMiddleware.verifyToken, 
  authMiddleware.attachUserData,
  userController.getCurrentUser);

// Update user details (authenticated users only)
router.put('/me',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  userController.updateCurrentUser);

// === ADMIN ROUTES ===

// Get all users (admin only)
router.get('/',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  userController.getAllUsers);

// Update user role (admin only)
router.patch('/:userId/role',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  userController.updateUserRole);

// Delete user (admin only)
router.delete('/:userId',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  userController.deleteUser);

// Make user an organizer for specific events (admin only)
router.post('/:userId/events/:eventId',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  userController.assignEventToOrganizer);

// Remove event from organizer (admin only)
router.delete('/:userId/events/:eventId',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  userController.removeEventFromOrganizer);

module.exports = router;