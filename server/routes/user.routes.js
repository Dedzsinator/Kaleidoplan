import express from 'express';

const router = express.Router();
import userController from '../controllers/user.controller';
import authMiddleware from '../middleware/auth';

// Create middleware combinations for common patterns
const authenticatedUser = [authMiddleware.verifyToken, authMiddleware.attachUserData];

const adminOnly = [authMiddleware.verifyToken, authMiddleware.attachUserData, authMiddleware.requireAdmin];

// === USER ROUTES (Authenticated users only) ===

// Get current user
router.get('/me', authenticatedUser, userController.getCurrentUser);

// Update user details
router.put('/me', authenticatedUser, userController.updateCurrentUser);

// Get user events (for current user)
router.get('/events', authenticatedUser, userController.getUserEvents);

// Verify admin status
router.get('/verify-admin', authenticatedUser, (req, res) => {
  res.json({
    isAdmin: !!(req.userData?.role === 'admin' || req.user?.role === 'admin'),
    userData: {
      uid: req.userData?.uid,
      email: req.userData?.email,
      role: req.userData?.role,
      firebaseRole: req.user?.role,
    },
  });
});

// Set admin role (special case - authenticated user only, not admin required)
router.post('/set-admin-role', authenticatedUser, userController.setAdminRole);

// === ADMIN ROUTES ===

// Get all users
router.get('/', adminOnly, userController.getAllUsers);

// Update user role
router.patch('/:userId/role', adminOnly, userController.updateUserRole);

// Delete user
router.delete('/:userId', adminOnly, userController.deleteUser);

// Make user an organizer for specific events
router.post('/:userId/events/:eventId', adminOnly, userController.assignEventToOrganizer);

// Remove event from organizer
router.delete('/:userId/events/:eventId', adminOnly, userController.removeEventFromOrganizer);

// Get events for a specific user (admin viewing other users)
router.get('/:userId/events', adminOnly, userController.getUserEvents);

module.exports = router;
