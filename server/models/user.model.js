const mongoose = require('mongoose');

// Updated schema to include authProvider field
const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    sparse: true, // Allow null/undefined values
  },
  firebaseUid: {
    type: String,
    sparse: true, // Allow null/undefined values
  },
  email: { type: String, required: true },
  displayName: { type: String },
  photoURL: { type: String },
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user',
  },
  authProvider: {
    type: String,
    enum: ['password', 'google', 'github'],
    default: 'password',
  },
  lastLogin: { type: Date, default: Date.now },
});

// Create a compound index with uid to ensure uniqueness
userSchema.index({ uid: 1 }, { unique: true });

// Pre-save hook to ensure consistency across uid fields
userSchema.pre('save', function (next) {
  // Ensure uid is copied to other id fields if they're empty
  if (this.uid) {
    if (!this.userId) this.userId = this.uid;
    if (!this.firebaseUid) this.firebaseUid = this.uid;
  }

  // If firebaseUid is null, set it to undefined to avoid unique index issues
  if (this.firebaseUid === null) {
    this.firebaseUid = undefined;
  }

  next();
});

module.exports = mongoose.model('User', userSchema);
