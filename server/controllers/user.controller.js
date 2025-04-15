const User = require('../models/user.model');
const admin = require('../config/firebase');

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without sensitive info
    res.status(200).json({
      uid: req.userData.uid,
      email: req.userData.email,
      displayName: req.userData.displayName,
      role: req.userData.role,
      photoURL: req.userData.photoURL,
      createdAt: req.userData.createdAt,
      lastLogin: req.userData.lastLogin
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update current user profile
exports.updateCurrentUser = async (req, res) => {
  try {
    const { displayName, photoURL, preferences } = req.body;
    
    if (!req.userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields
    if (displayName) req.userData.displayName = displayName;
    if (photoURL) req.userData.photoURL = photoURL;
    
    // Update preferences if provided
    if (preferences) {
      req.userData.preferences = {
        ...req.userData.preferences || {},
        ...preferences
      };
    }
    
    req.userData.updatedAt = new Date();
    await req.userData.save();
    
    // Update Firebase Auth user if needed
    await admin.auth().updateUser(req.userData.uid, {
      displayName: displayName || req.userData.displayName,
      photoURL: photoURL || req.userData.photoURL
    });
    
    res.status(200).json({
      uid: req.userData.uid,
      displayName: req.userData.displayName,
      photoURL: req.userData.photoURL,
      role: req.userData.role,
      preferences: req.userData.preferences
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { limit = 50, page = 1, role, search } = req.query;
    
    // Build filter
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users
    const users = await User.find(filter)
      .select('-passwordHash -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalUsers = await User.countDocuments(filter);
    
    res.status(200).json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    
    // Valid roles
    const validRoles = ['user', 'organizer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        validRoles
      });
    }
    
    // Find user
    const user = await User.findOne({ uid: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update role
    user.role = role;
    user.updatedAt = new Date();
    await user.save();
    
    res.status(200).json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user
    const user = await User.findOne({ uid: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (firebaseError) {
      console.warn('Firebase user deletion error:', firebaseError);
      // Continue with local deletion even if Firebase deletion fails
    }
    
    // Delete from our database
    await User.deleteOne({ uid: userId });
    
    res.status(200).json({
      message: 'User deleted successfully',
      uid: userId
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign event to organizer (admin only)
exports.assignEventToOrganizer = async (req, res) => {
  try {
    const { userId, eventId } = req.params;
    
    // Find user
    const user = await User.findOne({ uid: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Ensure user is or becomes an organizer
    if (user.role !== 'organizer' && user.role !== 'admin') {
      user.role = 'organizer';
    }
    
    // Initialize managedEvents array if it doesn't exist
    if (!user.managedEvents) {
      user.managedEvents = [];
    }
    
    // Check if event is already assigned
    if (user.managedEvents.includes(eventId)) {
      return res.status(400).json({ error: 'Event already assigned to this organizer' });
    }
    
    // Assign event
    user.managedEvents.push(eventId);
    await user.save();
    
    res.status(200).json({
      message: 'Event assigned to organizer',
      uid: user.uid,
      displayName: user.displayName,
      role: user.role,
      managedEvents: user.managedEvents
    });
  } catch (error) {
    console.error('Error assigning event to organizer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove event from organizer (admin only)
exports.removeEventFromOrganizer = async (req, res) => {
  try {
    const { userId, eventId } = req.params;
    
    // Find user
    const user = await User.findOne({ uid: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has managedEvents
    if (!user.managedEvents || !user.managedEvents.includes(eventId)) {
      return res.status(400).json({ error: 'User is not managing this event' });
    }
    
    // Remove event
    user.managedEvents = user.managedEvents.filter(id => id.toString() !== eventId);
    
    // If no more events and not admin, downgrade to regular user
    if (user.managedEvents.length === 0 && user.role === 'organizer') {
      user.role = 'user';
    }
    
    await user.save();
    
    res.status(200).json({
      message: 'Event removed from organizer',
      uid: user.uid,
      displayName: user.displayName,
      role: user.role,
      managedEvents: user.managedEvents
    });
  } catch (error) {
    console.error('Error removing event from organizer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};