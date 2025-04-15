const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { 
    type: String, 
    required: true, 
    unique: true 
  }, // Firebase UID
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  displayName: String,
  photoURL: String,
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user'
  },
  // If user is organizer, track which events they manage
  managedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: Date
});

// Pre-save hook to update the updatedAt field
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;