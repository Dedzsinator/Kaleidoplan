// Event model schema following the data structure from data.csv
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Use _id from MongoDB or imported ID for compatibility
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  color: {
    type: String,
    default: '#3357FF'
  },
  coverImageUrl: String,
  slideshowImages: [String],
  performers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performer'
  }],
  playlistId: String,
  createdBy: String,
  location: String,
  latitude: Number,
  longitude: Number,
  latitudeDelta: {
    type: Number,
    default: 0.01
  },
  longitudeDelta: {
    type: Number,
    default: 0.01
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: function() {
      const now = new Date();
      if (this.startDate <= now && this.endDate >= now) {
        return 'ongoing';
      } else if (this.startDate > now) {
        return 'upcoming';
      } else {
        return 'completed';
      }
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for sponsors
eventSchema.virtual('sponsors', {
  ref: 'EventSponsor',
  localField: '_id',
  foreignField: 'eventId',
  justOne: false
});

// Virtual for tasks
eventSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'eventId',
  justOne: false
});

// Ensure text fields are searchable
eventSchema.index({ 
  name: 'text', 
  description: 'text', 
  location: 'text' 
});

// Index for date-based queries
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ status: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;