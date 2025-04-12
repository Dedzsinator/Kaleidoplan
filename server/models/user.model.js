// User model for MongoDB storage
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    trim: true
  },
  photoURL: String,
  role: {
    type: String,
    enum: ['admin', 'organizer', 'user', 'guest'],
    default: 'user'
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: { type: String, default: 'dark' }
  },
  bio: String,
  location: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Create index for faster queries
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;