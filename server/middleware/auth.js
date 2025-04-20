const admin = require('../config/firebase');
const User = require('../models/user.model');
const OrganizerEvent = require('../models/organizer-event.model');

exports.requireAdmin = (req, res, next) => {
  console.log('Checking admin privileges for user:', req.user?.email);
  console.log('User claims:', req.user);

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
      console.log('No auth token provided');
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.uid = decodedToken.uid; // Ensure this is set correctly
    
    console.log(`Token verified for user: ${decodedToken.email}, UID: ${decodedToken.uid}`);
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

exports.attachUserData = async (req, res, next) => {
  try {
    if (!req.uid) {
      console.log('No UID found in request, skipping user data attachment');
      return next();
    }

    // Find user in MongoDB
    const User = require('../models/user.model');
    let user = await User.findOne({ uid: req.uid });
    
    console.log(`Looking for user with uid: ${req.uid}, found: ${user ? 'yes' : 'no'}`);

    // Create new user if not found
    if (!user) {
      console.log('User not found in MongoDB, creating...');
      
      // Only create if we have email from Firebase
      if (!req.user || !req.user.email) {
        console.log('No email found in token, skipping user creation');
        req.userData = null;
        return next();
      }

      try {
        user = new User({
          uid: req.uid,
          email: req.user.email,
          displayName: req.user.name || req.user.email.split('@')[0],
          photoURL: req.user.picture || null,
          role: req.user.role || 'user',
          managedEvents: [],
          lastLogin: new Date()
        });

        await user.save();
        console.log('Created new user in database:', user.email);
      } catch (createError) {
        console.error('Failed to create new user:', createError);
        req.userData = null;
        return next();
      }
    }

    // Attach MongoDB user data to request
    req.userData = user;
    
    console.log('User data attached:', {
      uid: user.uid,
      email: user.email,
      role: user.role,
      managedEvents: user.managedEvents || []
    });
    
    next();
  } catch (error) {
    console.error('Error attaching user data:', error);
    req.userData = null;
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
  console.log(
    'Checking admin privileges for user:',
    req.userData
      ? {
          uid: req.userData.uid,
          email: req.userData.email,
          role: req.userData.role,
        }
      : 'No user data',
  );

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
    console.log('Checking organizer/admin privileges for user:', req.user?.email);
    
    // Admin can always access
    if (req.user && req.user.role === 'admin') {
      console.log('User is admin - access granted');
      return next();
    }
    
    // For organizers, check both in Firebase token claims and MongoDB
    if (req.user && req.user.role === 'organizer') {
      console.log('User is organizer in Firebase claims');
      return next();
    }
    
    // Also check MongoDB user record
    const user = await User.findOne({ uid: req.user.uid });
    if (user && user.role === 'organizer') {
      console.log('User is organizer in MongoDB');
      return next();
    }
    
    // Final check - see if they have any event assignments
    const hasEvents = await OrganizerEvent.exists({ userId: req.user.uid });
    if (hasEvents) {
      console.log('User has organizer event assignments');
      return next();
    }
    
    console.log('User is not an organizer or admin');
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
      eventId: eventId
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
