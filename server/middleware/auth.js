// Authentication middleware using Firebase Admin
const { admin } = require('../config/firebase');
const User = require('../models/user.model');

/**
 * Middleware to verify Firebase authentication tokens
 * and ensure users are authenticated to access protected routes
 */
const authenticateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user role and data from MongoDB if available
    let mongoUser = null;
    try {
      mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });
    } catch (mongoErr) {
      console.warn('Could not fetch user data from MongoDB:', mongoErr);
    }
    
    // Combine Firebase claims with MongoDB user data
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      role: decodedToken.role || (mongoUser ? mongoUser.role : 'user'),
      displayName: decodedToken.name || (mongoUser ? mongoUser.displayName : ''),
      mongoId: mongoUser ? mongoUser._id : null
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid token',
      details: error.message
    });
  }
};

/**
 * Optional authentication - populates user if token valid, but doesn't block requests
 * Used for public endpoints that still benefit from knowing user identity
 */
const optionalAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user data from MongoDB if available
    let mongoUser = null;
    try {
      mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });
    } catch (mongoErr) {
      // Continue even if MongoDB user fetch fails
    }
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: decodedToken.role || (mongoUser ? mongoUser.role : 'user'),
      displayName: decodedToken.name || (mongoUser ? mongoUser.displayName : ''),
      mongoId: mongoUser ? mongoUser._id : null
    };
    
    next();
  } catch (error) {
    // Don't block the request on authentication failure
    req.user = null;
    next();
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorizeRoles('admin', 'organizer')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role 
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateFirebaseToken,
  optionalAuthentication,
  authorizeRoles
};