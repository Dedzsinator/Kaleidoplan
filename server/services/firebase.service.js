// Firebase service for interacting with Firebase Auth
const { admin } = require('../config/firebase');
const User = require('../models/user.model');

/**
 * Get user details from Firebase
 */
const getUserDetails = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error(`Error fetching user ${uid} from Firebase:`, error);
    return null;
  }
};

/**
 * Create or update user in MongoDB from Firebase data
 */
const syncUserToMongoDB = async (firebaseUser) => {
  try {
    // Check if user exists in MongoDB
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });

    // Determine role based on email
    const email = firebaseUser.email || '';
    const role = email.includes('admin')
      ? 'admin'
      : (firebaseUser.customClaims && firebaseUser.customClaims.role) || 'user';

    if (user) {
      // Update existing user
      user.email = firebaseUser.email || user.email;
      user.displayName = firebaseUser.displayName || user.displayName;
      user.photoURL = firebaseUser.photoURL || user.photoURL;
      user.role = role; // Update role based on email
      user.lastLogin = new Date();

      await user.save();
    } else {
      // Create new user
      user = new User({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: role, // Set role based on email
        lastLogin: new Date(),
      });

      await user.save();
    }

    // Always update Firebase custom claims to match
    await admin.auth().setCustomUserClaims(firebaseUser.uid, { role });

    return user;
  } catch (error) {
    console.error('Error syncing user to MongoDB:', error);
    throw error;
  }
};

/**
 * Set custom claims (like role) for a user
 */
const setUserRole = async (uid, role) => {
  try {
    await admin.auth().setCustomUserClaims(uid, { role });

    // Update user in MongoDB
    await User.findOneAndUpdate({ firebaseUid: uid }, { role }, { new: true });

    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

/**
 * Create a new Firebase user
 */
const createUser = async (userData) => {
  try {
    const { email, password, displayName, role = 'user' } = userData;

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    // Set role in custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // Create user in MongoDB
    await syncUserToMongoDB({
      uid: userRecord.uid,
      email,
      displayName,
      customClaims: { role },
    });

    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

module.exports = {
  getUserDetails,
  syncUserToMongoDB,
  setUserRole,
  createUser,
};
