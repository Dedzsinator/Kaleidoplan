const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth');

// All routes require admin privileges
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.attachUserData);
router.use(authMiddleware.requireAdmin);

// Analytics routes
router.get('/stats', adminController.getStats);
router.get('/login-activity', adminController.getLoginActivity);
router.get('/active-users', adminController.getActiveUsers);

module.exports = router;
