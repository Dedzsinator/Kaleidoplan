const admin = require('../config/firebase');
const User = require('../models/user.model');

// Verify Firebase token and attach user to request
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Set decoded token on request
    req.user = decodedToken;
    req.uid = decodedToken.uid;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Check if user exists in MongoDB, create if new
exports.attachUserData = async (req, res, next) => {
  try {
    // Skip if no authenticated user
    if (!req.uid) {
      return next();
    }
    
    // Find user in MongoDB
    let user = await User.findOne({ uid: req.uid });
    
    // Create new user if not found
    if (!user) {
      user = new User({
        uid: req.uid,
        email: req.user.email,
        displayName: req.user.name || req.user.email.split('@')[0],
        photoURL: req.user.picture || null,
        role: 'user', // Default role is 'user'
        lastLogin: new Date()
      });
      
      await user.save();
      
      // Also set the custom claim in Firebase
      await admin.auth().setCustomUserClaims(req.uid, { role: 'user' });
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Attach MongoDB user data to request
    req.userData = user;
    next();
  } catch (error) {
    console.error('Error attaching user data:', error);
    next(error);
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
        current: req.userData.role
      });
    }
    
    next();
  };
};

// Special middleware for admin-only routes
exports.requireAdmin = (req, res, next) => {
  if (req.userData && req.userData.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin role' });
};

// Special middleware for organizer-or-admin routes
exports.requireOrganizerOrAdmin = (req, res, next) => {
  if (req.userData && ['organizer', 'admin'].includes(req.userData.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires organizer or admin role' });
};

// Event ownership middleware - checks if user is admin or an organizer of a specific event
exports.checkEventOwnership = async (req, res, next) => {
  try {
    // Admin can access any event
    if (req.userData && req.userData.role === 'admin') {
      return next();
    }
    
    // Check if user is organizer
    if (req.userData && req.userData.role === 'organizer') {
      const eventId = req.params.id || req.body.eventId;
      
      if (!eventId) {
        return res.status(400).json({ error: 'Bad request: Event ID is required' });
      }
      
      // Check if user is organizer of this event
      if (req.userData.managedEvents && 
          req.userData.managedEvents.some(id => id.toString() === eventId.toString())) {
        return next();
      }
    }
    
    return res.status(403).json({ error: 'Forbidden: You do not manage this event' });
  } catch (error) {
    next(error);
  }
};