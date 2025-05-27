import jwt from 'jsonwebtoken';

import admin from '../config/firebase';
import User from '../models/user.model';

const { generateTokens, setAuthCookies, clearAuthCookies } = require('../middleware/token');

// In your login handler
exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      if (!uid) {
        return res.status(401).json({ error: 'Invalid token: missing uid' });
      }

      let user = await User.findOne({
        $or: [{ uid: uid }, { userId: uid }, { firebaseUid: uid }],
      });

      if (!user) {
        // Get user details from Firebase
        const userRecord = await admin.auth().getUser(uid);

        try {
          user = new User({
            uid: userRecord.uid,
            userId: userRecord.uid,
            firebaseUid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName || userRecord.email.split('@')[0],
            photoURL: userRecord.photoURL || null,
            role: (userRecord.customClaims && userRecord.customClaims.role) || 'user',
            lastLogin: new Date(),
          });

          await user.save();
        } catch (mongoError) {
          console.error('MongoDB save error:', mongoError);
          if (mongoError.code === 11000) {
            // If duplicate key error, attempt to find the user without creating
            const dupUser = await User.findOne({});

            if (dupUser) {
              // Update the user with the correct IDs
              dupUser.uid = userRecord.uid;
              dupUser.userId = userRecord.uid;
              dupUser.firebaseUid = userRecord.uid;
              dupUser.email = userRecord.email;
              dupUser.displayName = userRecord.displayName || userRecord.email.split('@')[0];
              dupUser.photoURL = userRecord.photoURL || null;
              dupUser.role = (userRecord.customClaims && userRecord.customClaims.role) || 'user';
              dupUser.lastLogin = new Date();

              await dupUser.save();
              user = dupUser;
            } else {
              return res.status(500).json({ error: 'User creation failed due to database constraint' });
            }
          } else {
            throw mongoError; // Re-throw if it's not a duplicate key error
          }
        }
      } else {
        // Update last login
        user.lastLogin = new Date();
        // Ensure all ID fields are set properly
        if (!user.uid) user.uid = uid;
        if (!user.userId) user.userId = uid;
        if (!user.firebaseUid) user.firebaseUid = uid;
        await user.save();
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Set tokens as HTTP-only cookies
      setAuthCookies(res, accessToken, refreshToken);

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Logout handler
exports.logout = (req, res) => {
  try {
    // Clear auth cookies
    clearAuthCookies(res);

    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.githubCallback = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Check if user exists in our database - check all ID fields
      let user = await User.findOne({
        $or: [{ uid: uid }, { userId: uid }, { firebaseUid: uid }],
      });

      if (!user) {
        // Get user details from Firebase
        const userRecord = await admin.auth().getUser(uid);

        // Create new user in our database
        user = new User({
          uid: userRecord.uid,
          userId: userRecord.uid,
          firebaseUid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'GitHub User'),
          photoURL: userRecord.photoURL || null,
          role: 'user', // Default role
          lastLogin: new Date(),
          authProvider: 'github', // Track auth provider
        });

        await user.save();
      } else {
        // Update last login
        user.lastLogin = new Date();
        // Ensure all ID fields are set
        if (!user.uid) user.uid = uid;
        if (!user.userId) user.userId = uid;
        if (!user.firebaseUid) user.firebaseUid = uid;
        // Update auth provider
        user.authProvider = 'github';
        await user.save();
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Set tokens as HTTP-only cookies
      setAuthCookies(res, accessToken, refreshToken);

      return res.status(200).json({
        message: 'GitHub authentication successful',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
        },
      });
    } catch (error) {
      console.error('GitHub token verification failed:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'GitHub authentication failed' });
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

      // Check if user exists in our database - check all ID fields
      let user = await User.findOne({
        $or: [{ uid: uid }, { userId: uid }, { firebaseUid: uid }],
      });

      if (!user) {
        // Get user details from Firebase
        const userRecord = await admin.auth().getUser(uid);

        // Create new user in our database
        user = new User({
          uid: userRecord.uid,
          userId: userRecord.uid,
          firebaseUid: userRecord.uid,
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
        // Ensure all ID fields are set
        if (!user.uid) user.uid = uid;
        if (!user.userId) user.userId = uid;
        if (!user.firebaseUid) user.firebaseUid = uid;
        await user.save();
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Set tokens as HTTP-only cookies
      setAuthCookies(res, accessToken, refreshToken);

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

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      // Don't log errors for missing tokens on refresh endpoint since this is a common case
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    try {
      // Verify the refresh token with less verbose error logging
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

      if (!decoded.uid) {
        return res.status(401).json({ error: 'Invalid token: missing uid' });
      }

      // Find user in database - check all ID fields
      const user = await User.findOne({
        $or: [{ uid: decoded.uid }, { userId: decoded.uid }, { firebaseUid: decoded.uid }],
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Set new tokens as cookies
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      return res.status(200).json({
        message: 'Token refreshed successfully',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
        },
      });
    } catch (error) {
      // Don't log token expiration errors, these are normal
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      console.error('Refresh token verification failed:', error);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// In the getUserProfile function
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    if (!userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Find user in database - check all possible ID fields
    const user = await User.findOne({
      $or: [{ uid: userId }, { userId: userId }, { firebaseUid: userId }],
    });

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
