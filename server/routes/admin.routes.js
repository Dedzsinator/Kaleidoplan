import express from 'express';

import adminController from '../controllers/admin.controller';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// All routes require admin privileges
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.attachUserData);
router.use(authMiddleware.requireAdmin);

// Analytics routes
router.get('/stats', adminController.getStats);
router.get('/login-activity', adminController.getLoginActivity);
router.get('/active-users', adminController.getActiveUsers);
router.get(
  '/organizer-assignments',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData,
  authMiddleware.requireAdmin,
  adminController.getOrganizerAssignments,
);

router.get(
  '/firebase/users/:userId',
  authMiddleware.verifyToken,
  authMiddleware.attachUserData, // Ensures req.user is populated for requireAdmin
  authMiddleware.requireAdmin,
  adminController.getFirebaseUserById,
);

module.exports = router;

module.exports = router;
