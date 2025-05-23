const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');
const authenticateFirebaseToken = authMiddleware.verifyToken;

// Public routes
// Add refresh token route - no auth required
router.post('/refresh', authController.refresh);

router.post(
  '/login',
  typeof authController.login === 'function'
    ? authController.login
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

router.post(
  '/logout',
  typeof authController.logout === 'function'
    ? authController.logout
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

router.post(
  '/google-auth',
  typeof authController.googleCallback === 'function'
    ? authController.googleCallback
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

router.post(
  '/github-auth',
  typeof authController.githubCallback === 'function'
    ? authController.githubCallback
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

router.post('/verify-token', authenticateFirebaseToken, (req, res) => {
  res.status(200).json({
    valid: true,
    user: {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Protected routes - require authentication
router.use(authenticateFirebaseToken);

// User profile management
router.post(
  '/profile',
  typeof authController.createUserProfile === 'function'
    ? authController.createUserProfile
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

router.get(
  '/profile',
  typeof authController.getUserProfile === 'function'
    ? authController.getUserProfile
    : (req, res) => res.status(501).json({ error: 'Not implemented' }),
);

module.exports = router;
