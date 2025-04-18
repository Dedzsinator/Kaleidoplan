const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const spotifyTrackSchema = new mongoose.Schema({
  id: String,
  name: String,
  artist: String,
  album: String,
  duration: Number,
  imageUrl: String,
  previewUrl: String,
});

const spotifyPlaylistSchema = new Schema(
  {
    // Add a string playlistId field to support non-ObjectId IDs
    playlistId: {
      type: String,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Allow tracks to be an array of track objects OR a simple array of track IDs
    tracks: {
      type: Schema.Types.Mixed,
      default: []
    },
    public: {
      type: Boolean,
      default: true,
    },
    eventId: {
      type: Schema.Types.Mixed, // Allow both ObjectId and string
      ref: 'Event',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SpotifyPlaylist', spotifyPlaylistSchema);
