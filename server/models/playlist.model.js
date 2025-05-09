const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// spotifyTrackSchema remains the same
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
    // MongoDB will generate an ObjectId for _id by default

    // Use playlistId as the primary lookup field for "pl1", "pl2" etc.
    playlistId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    tracks: {
      type: Schema.Types.Mixed, // Keeps flexibility
      default: [],
    },
    public: {
      type: Boolean,
      default: true,
    },
    eventId: {
      type: String,
      ref: 'Event',
    },
    spotifyId: {
      type: String,
      sparse: true,
      unique: true,
      default: null,
    },
    spotifyUri: String,
    coverImageUrl: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('playlists', spotifyPlaylistSchema);
