const admin = require('../config/firebase');
const Event = require('../models/event.model');

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get the user from Firebase
    const userRecord = await admin.auth().getUser(req.uid);
    
    // Create a user object with the necessary fields
    const user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email.split('@')[0],
      photoURL: userRecord.photoURL,
      role: (userRecord.customClaims && userRecord.customClaims.role) || 'user',
      createdAt: userRecord.metadata.creationTime,
      lastLogin: userRecord.metadata.lastSignInTime
    };
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

// Update current user profile
exports.updateCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { displayName, photoURL } = req.body;
    
    // Update user in Firebase
    await admin.auth().updateUser(req.uid, {
      displayName,
      photoURL
    });
    
    // Get updated user
    const userRecord = await admin.auth().getUser(req.uid);
    
    res.status(200).json({ 
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        role: (userRecord.customClaims && userRecord.customClaims.role) || 'user'
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Get all users from Firebase
exports.getAllUsers = async (req, res) => {
  try {
    console.log("Getting all users from Firebase...");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Firebase has different pagination
    
    // Firebase Auth listUsers returns up to 1000 users at a time with pagination
    let users = [];
    let nextPageToken;
    
    // Get batch of users from Firebase
    const listUsersResult = await admin.auth().listUsers(limit);
    users = listUsersResult.users;
    
    console.log(`Found ${users.length} users from Firebase`);
    
    // Format user data to match expected format in frontend
    const formattedUsers = users.map(user => {
      // Extract role from custom claims
      const role = (user.customClaims && user.customClaims.role) || 'user';
      
      return {
        _id: user.uid, // Use uid as _id for compatibility
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        role: role,
        createdAt: user.metadata.creationTime,
        lastLogin: user.metadata.lastSignInTime,
        photoURL: user.photoURL,
        // Without MongoDB, we won't have managed events
        managedEvents: []
      };
    });
    
    res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: users.length,
        pages: 1,
        page: 1,
        limit: users.length
      }
    });
  } catch (error) {
    console.error('Error getting users from Firebase:', error);
    res.status(500).json({ error: 'Failed to retrieve users: ' + error.message });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(userId, { role });
    
    // Get updated user
    const userRecord = await admin.auth().getUser(userId);
    
    res.status(200).json({ 
      user: {
        _id: userRecord.uid,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: role,
        photoURL: userRecord.photoURL
      } 
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Delete from Firebase
    await admin.auth().deleteUser(userId);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// For Firebase-only approach, these event management functions won't do anything useful
// without a database to store the relationships
exports.assignEventToOrganizer = async (req, res) => {
  res.status(200).json({ message: 'Feature not available in Firebase-only mode' });
};

exports.removeEventFromOrganizer = async (req, res) => {
  res.status(200).json({ message: 'Feature not available in Firebase-only mode' });
};

exports.getUserEvents = async (req, res) => {
  // For Firebase-only approach, we'll just return an empty array
  res.status(200).json({ events: [] });
};

exports.setAdminRole = async (req, res) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Set admin role in Firebase
    await admin.auth().setCustomUserClaims(req.uid, { role: 'admin' });
    
    // Get updated user
    const userRecord = await admin.auth().getUser(req.uid);
    
    res.status(200).json({
      message: 'Admin role set successfully, please log out and log back in.',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Error setting admin role:', error);
    res.status(500).json({ error: 'Failed to set admin role' });
  }
};