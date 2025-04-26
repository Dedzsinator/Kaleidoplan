const mongoose = require('mongoose');

// In your user schema, change the userId field to uid and make it required
const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  email: { type: String, required: true },
  displayName: { type: String },
  photoURL: { type: String },
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user',
  },
  // Remove managedEvents from here - we'll use the separate collection
  lastLogin: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
