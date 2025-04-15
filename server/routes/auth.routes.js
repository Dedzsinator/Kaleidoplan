const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');
const authenticateFirebaseToken = authMiddleware.verifyToken;

// Public routes
// Check if these controller methods exist before using them
if (typeof authController.login !== 'function') {
  console.error('Warning: authController.login is not defined');
}

if (typeof authController.logout !== 'function') {
  console.error('Warning: authController.logout is not defined');
}

if (typeof authController.googleCallback !== 'function') {
  console.error('Warning: authController.googleCallback is not defined');
}

// The issue is with one of these routes - implement missing controller methods
router.post('/login', 
  typeof authController.login === 'function' 
    ? authController.login 
    : (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.post('/logout', 
  typeof authController.logout === 'function' 
    ? authController.logout 
    : (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.post('/google-auth', 
  typeof authController.googleCallback === 'function' 
    ? authController.googleCallback 
    : (req, res) => res.status(501).json({ error: 'Not implemented' })
);

// This is already correct
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

// User profile management - check if these methods exist too
router.post('/profile', 
  typeof authController.createUserProfile === 'function' 
    ? authController.createUserProfile 
    : (req, res) => res.status(501).json({ error: 'Not implemented' })
);

router.get('/profile', 
  typeof authController.getUserProfile === 'function' 
    ? authController.getUserProfile 
    : (req, res) => res.status(501).json({ error: 'Not implemented' })
);

module.exports = router;