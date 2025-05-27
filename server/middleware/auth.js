import jwt from 'jsonwebtoken';

import admin from '../config/firebase';
import User from '../models/user.model';
import OrganizerEvent from '../models/organizer-event.model';

import { ACCESS_TOKEN_SECRET } from './token';

exports.verifyToken = async (req, res, next) => {
  try {
    // First check for JWT in cookies (preferred method)
    const token = req.cookies.access_token;

    if (token) {
      try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        req.user = decoded;
        req.uid = decoded.uid;
        return next();
      } catch (jwtError) {
        if (jwtError.name !== 'TokenExpiredError') {
          console.error('JWT verification failed:', jwtError);
          // For other errors, we'll try the Authorization header as fallback
        }
      }
    }

    // Fallback to Authorization header for backwards compatibility
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const bearerToken = authHeader.split(' ')[1];

    // Try to verify as Firebase token
    try {
      const decodedToken = await admin.auth().verifyIdToken(bearerToken);
      req.user = decodedToken;
      req.uid = decodedToken.uid;
      next();
    } catch (firebaseError) {
      console.error('Token verification failed:', firebaseError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

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
    // First check for JWT in cookies (preferred method)
    const token = req.cookies.access_token;

    if (token) {
      try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        req.user = decoded;
        req.uid = decoded.uid;
        return next();
      } catch (jwtError) {
        // Don't log token expiration errors, these are normal
        if (jwtError.name !== 'TokenExpiredError') {
          console.error('JWT verification failed:', jwtError);
        }
        // Fall through to try Authorization header
      }
    }

    // Fallback to Authorization header for backwards compatibility
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const bearerToken = authHeader.split(' ')[1];

    // Try to verify as Firebase token
    try {
      const decodedToken = await admin.auth().verifyIdToken(bearerToken);
      req.user = decodedToken;
      req.uid = decodedToken.uid;
      next();
    } catch (firebaseError) {
      return res.status(401).json({ error: 'Invalid authentication token ${}', firebaseError });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// In the attachUserData function
exports.attachUserData = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Make sure we set uid properly from the token
    if (!req.user.uid && req.uid) {
      req.user.uid = req.uid;
    }

    // Try both uid and userId for backward compatibility
    const user = await User.findOne({
      $or: [{ uid: req.uid }, { userId: req.uid }],
    });

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

    const isOrganizerRole =
      (req.user && req.user.role === 'organizer') || (await User.findOne({ uid: req.user.uid, role: 'organizer' }));

    // If user has organizer role, check if they actually have events
    if (isOrganizerRole) {
      const hasEvents = await OrganizerEvent.exists({ userId: req.user.uid });

      if (hasEvents) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Forbidden: Requires organizer or admin role' });
  } catch (error) {
    console.error('Error in requireOrganizerOrAdmin middleware:', error);
    return res.status(500).json({ error: 'Server error checking permissions' });
  }
};

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
