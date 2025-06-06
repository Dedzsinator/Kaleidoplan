// Event model schema following the data structure from data.csv
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    // Use _id from MongoDB or imported ID for compatibility
    id: {
      type: String,
      index: true, // Index for faster lookups
    },
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    color: {
      type: String,
      default: '#3357FF',
    },
    coverImageUrl: {
      type: String,
      trim: true,
    },
    coverImagePublicId: {
      type: String,
      trim: true,
    },
    slideshowImages: {
      type: [String],
      default: [],
    },
    slideshowImagePublicIds: {
      type: [String],
      default: [],
    },
    coverImageUrl: String,
    slideshowImages: [String],
    performers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Performer',
      },
    ],
    playlistId: String,
    createdBy: String,
    location: String,
    latitude: Number,
    longitude: Number,
    latitudeDelta: {
      type: Number,
      default: 0.01,
    },
    longitudeDelta: {
      type: Number,
      default: 0.01,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: function () {
        const now = new Date();
        if (this.startDate <= now && this.endDate >= now) {
          return 'ongoing';
        } else if (this.startDate > now) {
          return 'upcoming';
        } else {
          return 'completed';
        }
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for sponsors
eventSchema.virtual('sponsors', {
  ref: 'EventSponsor',
  localField: '_id',
  foreignField: 'eventId',
  justOne: false,
});

// Virtual for tasks
eventSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'eventId',
  justOne: false,
});

// Ensure text fields are searchable
eventSchema.index({
  name: 'text',
  description: 'text',
  location: 'text',
});

// Index for date-based queries
eventSchema.index({ id: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ status: 1 });

// Add pre-save hook to ensure 'id' field is set from _id if not explicitly provided
eventSchema.pre('save', function (next) {
  // If id is not set, use _id string representation
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
