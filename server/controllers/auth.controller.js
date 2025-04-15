const admin = require('firebase-admin');
const User = require('../models/user.model');

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Create or update user profile
exports.createUserProfile = async (req, res, next) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;

    // Validate input
    if (!uid || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }

    // Find existing user or create new
    let user = await User.findOne({ firebaseUid: uid });
    
    if (user) {
      // Update existing user
      user.email = email;
      if (displayName) user.name = displayName;
      if (photoURL) user.photoUrl = photoURL;
    } else {
      // Create new user
      user = new User({
        firebaseUid: uid,
        email,
        name: displayName || 'User',
        role: 'user',
        photoUrl: photoURL || '',
        preferences: { theme: 'light' }
      });
    }

    await user.save();
    
    // Set auth cookie
    const token = await admin.auth().createCustomToken(uid);
    res.cookie('authToken', token, COOKIE_CONFIG);
    
    // Return user data
    return res.status(200).json({
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl,
      preferences: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

// Get user profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl,
      preferences: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

// Login endpoint
exports.login = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email } = decodedToken;
    
    // Find or create user in our database
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      // Auto-create user if not exists (new Firebase user)
      user = new User({
        firebaseUid: uid,
        email,
        name: decodedToken.name || 'User',
        role: 'user',
        photoUrl: decodedToken.picture || '',
        preferences: { theme: 'light' }
      });
      await user.save();
    }
    
    // Set HTTP-Only cookie with token
    res.cookie('authToken', token, COOKIE_CONFIG);
    
    // Return user data
    return res.status(200).json({
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl,
      preferences: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

// Logout endpoint
exports.logout = async (req, res) => {
  res.clearCookie('authToken');
  return res.status(200).json({ message: 'Logged out successfully' });
};

// Google Auth callback
exports.googleCallback = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if it's a Google sign-in
    if (decodedToken.firebase?.sign_in_provider !== 'google.com') {
      return res.status(400).json({ error: 'Not a Google authentication' });
    }
    
    // Set HTTP-only cookie
    res.cookie('authToken', token, COOKIE_CONFIG);
    
    // Find or create user
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      user = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || 'Google User',
        role: 'user',
        photoUrl: decodedToken.picture || '',
        preferences: { theme: 'light' }
      });
      await user.save();
    }
    
    return res.status(200).json({
      uid: user.firebaseUid,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl
    });
  } catch (error) {
    next(error);
  }
};

// Add the missing functions that were causing the error
exports.setUserRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    
    // Validate input
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    // Verify role is valid
    if (!['user', 'admin', 'organizer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
    
    // Find user
    const user = await User.findOne({ firebaseUid: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update role
    user.role = role;
    await user.save();
    
    return res.status(200).json({
      message: 'User role updated successfully',
      user: {
        uid: user.firebaseUid,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, {
      firebaseUid: 1,
      email: 1, 
      name: 1,
      role: 1,
      photoUrl: 1,
      createdAt: 1
    });
    
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};