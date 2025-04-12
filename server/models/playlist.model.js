// Playlist model for storing event playlists
const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  playlistId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  spotifyId: {
    type: String,
    trim: true
  },
  spotifyUri: {
    type: String,
    trim: true
  },
  coverImageUrl: {
    type: String,
    trim: true
  },
  tracks: [{
    spotifyId: String,
    name: String,
    artist: String,
    albumName: String,
    albumImageUrl: String,
    durationMs: Number,
    uri: String
  }],
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  createdBy: String,
  updatedBy: String,
  public: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
playlistSchema.index({ playlistId: 1 });
playlistSchema.index({ eventId: 1 });
playlistSchema.index({ spotifyId: 1 });

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;