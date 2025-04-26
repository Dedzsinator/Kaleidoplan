const admin = require('../config/firebase');
const User = require('../models/user.model');
const OrganizerEvent = require('../models/organizer-event.model');

exports.requireAdmin = (req, res, next) => {
  // Check for admin role in Firebase custom claims
  if (
    req.user &&
    (req.user.role === 'admin' ||
      (req.user.customClaims && req.user.customClaims.role === 'admin') ||
      req.user.admin === true)
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Requires admin role',
    currentUser: {
      uid: req.uid,
      email: req.user?.email,
      claims: req.user,
    },
  });
};

exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.uid = decodedToken.uid; // Ensure this is set correctly

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

exports.attachUserData = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Make sure we set uid properly from the token
    if (!req.user.uid && req.uid) {
      req.user.uid = req.uid; // Make sure this line exists
    }

    const user = await User.findOne({ uid: req.uid });

    if (user) {
      // When attaching MongoDB user data, preserve the original uid!
      req.userData = user.toObject();
      req.user = {
        ...req.userData,
        uid: req.uid, // Ensure uid is kept from Firebase token
      };
    }

    next();
  } catch (error) {
    console.error('Error attaching user data:', error);
    next();
  }
};

// Role-based authorization middleware
exports.requireRole = (roles) => {
  return async (req, res, next) => {
    // Convert single role to array for easier checking
    const roleArray = Array.isArray(roles) ? roles : [roles];

    // Check if user data exists
    if (!req.userData) {
      return res.status(401).json({ error: 'Unauthorized: User data not found' });
    }

    // Check if user has required role
    if (!roleArray.includes(req.userData.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges',
        required: roleArray,
        current: req.userData.role,
      });
    }

    next();
  };
};

exports.requireAdmin = (req, res, next) => {
  // Check for admin role in both places
  if (
    (req.userData && req.userData.role === 'admin') ||
    (req.user && req.user.role === 'admin') ||
    (req.user && req.user.admin === true)
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Requires admin role',
    currentUser: req.userData
      ? {
          uid: req.userData.uid,
          role: req.userData.role,
        }
      : 'No user data',
  });
};

exports.requireOrganizerOrAdmin = async (req, res, next) => {
  try {
    // Admin can always access
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // For organizers, check both in Firebase token claims and MongoDB
    if (req.user && req.user.role === 'organizer') {
      return next();
    }

    // Also check MongoDB user record
    const user = await User.findOne({ uid: req.user.uid });
    if (user && user.role === 'organizer') {
      return next();
    }

    // Final check - see if they have any event assignments
    const hasEvents = await OrganizerEvent.exists({ userId: req.user.uid });
    if (hasEvents) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Requires organizer or admin role' });
  } catch (error) {
    console.error('Error in requireOrganizerOrAdmin middleware:', error);
    return res.status(500).json({ error: 'Server error checking permissions' });
  }
};

// Update checkEventOwnership middleware
exports.checkEventOwnership = async (req, res, next) => {
  try {
    // Admin can access any event
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    const eventId = req.params.id || req.body.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Bad request: Event ID is required' });
    }

    // Check if user is organizer of this specific event
    const isOrganizer = await OrganizerEvent.exists({
      userId: req.user.uid,
      eventId: eventId,
    });

    if (isOrganizer) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: You do not manage this event' });
  } catch (error) {
    console.error('Error checking event ownership:', error);
    next(error);
  }
};
