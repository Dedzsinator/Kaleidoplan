// Authentication routes for user management and Firebase Auth
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateFirebaseToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.post('/verify-token', authenticateFirebaseToken, (req, res) => {
  res.status(200).json({ 
    valid: true, 
    user: { 
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role
    } 
  });
});

// Protected routes - require authentication
router.use(authenticateFirebaseToken);

// User profile management
router.post('/profile', authController.createUserProfile);
router.get('/profile', authController.getUserProfile);

// Admin-only routes
router.post('/set-role', authorizeRoles('admin'), authController.setUserRole);
router.get('/users', authorizeRoles('admin'), authController.getUsers);

module.exports = router;