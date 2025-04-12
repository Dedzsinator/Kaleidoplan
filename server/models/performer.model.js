const mongoose = require('mongoose');

const performerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  image: String,
  website: String,
  socialMedia: {
    twitter: String,
    instagram: String,
    facebook: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Performer = mongoose.model('Performer', performerSchema);

module.exports = Performer;