const admin = require('../config/firebase');
const User = require('../models/user.model');

// Login handler
exports.login = async (req, res) => {
  try {
    const { email, password, idToken } = req.body;

    // Method 1: Using Firebase idToken (preferred for client-side auth)
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Find or create user in MongoDB
        let user = await User.findOne({ uid });

        if (!user) {
          // Get user details from Firebase
          const userRecord = await admin.auth().getUser(uid);

          user = new User({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName || email.split('@')[0],
            photoURL: userRecord.photoURL || null,
            role: 'user', // Default role
            lastLogin: new Date(),
          });

          await user.save();
        } else {
          // Update last login
          user.lastLogin = new Date();
          await user.save();
        }

        return res.status(200).json({
          message: 'Login successful',
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            photoURL: user.photoURL,
          },
        });
      } catch (error) {
        console.error('ID token verification failed:', error);
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }
    // Method 2: Using email/password directly (typically for server-side auth)
    else if (email && password) {
      return res.status(400).json({
        error: 'Direct email/password authentication not supported. Use Firebase client SDK.',
      });
    } else {
      return res.status(400).json({ error: 'Invalid authentication method' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Logout handler
exports.logout = (req, res) => {
  try {
    // Firebase handles token invalidation client-side
    // We just update the last session in our database

    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Google auth callback
exports.googleCallback = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Check if user exists in our database
      let user = await User.findOne({ uid });

      if (!user) {
        // Get user details from Firebase
        const userRecord = await admin.auth().getUser(uid);

        // Create new user in our database
        user = new User({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || userRecord.email.split('@')[0],
          photoURL: userRecord.photoURL || null,
          role: 'user', // Default role
          lastLogin: new Date(),
        });

        await user.save();
      } else {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
      }

      return res.status(200).json({
        message: 'Google authentication successful',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
        },
      });
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// Create or update user profile
exports.createUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { displayName, photoURL } = req.body;

    // Find user in database
    const user = await User.findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (displayName) user.displayName = displayName;
    if (photoURL) user.photoURL = photoURL;

    user.updatedAt = new Date();
    await user.save();

    // Also update in Firebase if needed
    await admin.auth().updateUser(userId, {
      displayName: displayName || user.displayName,
      photoURL: photoURL || user.photoURL,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Find user in database
    const user = await User.findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
