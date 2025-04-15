const mongoose = require('mongoose');

const spotifyTrackSchema = new mongoose.Schema({
  id: String,
  name: String,
  artist: String,
  album: String,
  duration: Number,
  imageUrl: String,
  previewUrl: String
});

const spotifyPlaylistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  tracks: [spotifyTrackSchema],
  public: {
    type: Boolean,
    default: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }
}, { timestamps: true });

module.exports = mongoose.model('SpotifyPlaylist', spotifyPlaylistSchema);