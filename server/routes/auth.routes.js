const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateFirebaseToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/google-auth', authController.googleCallback);

// This is line 30 causing the error:
// router.post('/verify-token', authenticateFirebaseToken, (req, res) => {
router.post('/verify-token', authenticateFirebaseToken, (req, res) => {
  res.status(200).json({ 
    valid: true, 
    user: { 
      uid: req.user.uid,
      email: req.user.email
    } 
  });
});

// Protected routes - require authentication
router.use(authenticateFirebaseToken);

// User profile management
router.post('/profile', authController.createUserProfile);
router.get('/profile', authController.getUserProfile);

// REMOVE or FIX these lines - they're causing the error
// router.post('/set-role', authorizeRoles('admin'), authController.setUserRole);
// router.get('/users', authorizeRoles('admin'), authController.getUsers);

module.exports = router;