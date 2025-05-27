import mongoose from 'mongoose';
const Schema = mongoose.Schema;

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
      type: mongoose.Schema.Types.Mixed, // Allow for both String and ObjectId
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

spotifyPlaylistSchema.pre('save', function (next) {
  // If no playlistId, create one based on the _id
  if (!this.playlistId && this._id) {
    this.playlistId = `pl${this._id.toString()}`;
  }

  // If eventId exists but is a numeric string like "1", try to find the actual event
  if (this.isNew && this.eventId && typeof this.eventId === 'string' && /^\d+$/.test(this.eventId)) {
    // This will be handled during the actual lookup
    console.warn(`Note: playlist has numeric eventId: ${this.eventId} - will be resolved during lookup`);
  }

  next();
});

module.exports = mongoose.model('playlists', spotifyPlaylistSchema);
