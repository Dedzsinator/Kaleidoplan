// Authentication controller handling Firebase Auth and user management
const { admin } = require('../config/firebase');
const User = require('../models/user.model');

/**
 * Create or update user profile after authentication
 */
const createUserProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { displayName, email, photoURL } = req.body;
    
    // Automatically determine role based on email containing 'admin'
    const role = email && email.includes('admin') ? 'admin' : 'user';
    console.log(`Setting role for ${email} to ${role}`);
    
    // Check if user exists in MongoDB
    let user = await User.findOne({ firebaseUid: uid });
    
    if (user) {
      // Update existing user
      user.displayName = displayName || user.displayName;
      user.email = email || user.email;
      user.photoURL = photoURL || user.photoURL;
      user.lastLogin = new Date();
      
      // Always update role based on email check
      user.role = role;
      
      await user.save();
      
      // Update Firebase custom claims to match
      await admin.auth().setCustomUserClaims(uid, { role });
      
      return res.status(200).json({ 
        message: 'User profile updated successfully',
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } else {
      // Create new user
      const newUser = new User({
        firebaseUid: uid,
        email,
        displayName,
        photoURL,
        role: role,
        lastLogin: new Date()
      });
      
      await newUser.save();
      
      // Set Firebase custom claims
      await admin.auth().setCustomUserClaims(uid, { role });
      
      return res.status(201).json({ 
        message: 'User profile created successfully',
        user: {
          id: newUser._id,
          firebaseUid: newUser.firebaseUid,
          email: newUser.email,
          displayName: newUser.displayName,
          photoURL: newUser.photoURL,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    // Get user data from MongoDB
    const user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // Get additional Firebase user data
    const firebaseUser = await admin.auth().getUser(uid);
    
    res.json({
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      emailVerified: firebaseUser.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      preferences: user.preferences,
      bio: user.bio,
      location: user.location,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set user role (admin only)
 */
const setUserRole = async (req, res, next) => {
  try {
    // Only admins can set roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Admin role required' });
    }
    
    const { uid, role } = req.body;
    
    if (!uid || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    if (!['admin', 'organizer', 'user', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: admin, organizer, user, or guest' });
    }
    
    // Update role in Firebase
    await admin.auth().setCustomUserClaims(uid, { role });
    
    // Update role in MongoDB
    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { role },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'User role updated successfully',
      user: { uid, role, displayName: user.displayName }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    // Only admins can list all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Admin role required' });
    }
    
    const { role, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    
    const users = await User.find(query)
      .select('firebaseUid email displayName role photoURL createdAt lastLogin')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUserProfile,
  getUserProfile,
  setUserRole,
  getUsers
};