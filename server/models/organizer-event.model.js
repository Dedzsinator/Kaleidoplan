const mongoose = require('mongoose');

const organizerEventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    eventId: {
      type: String, // Use String type to allow for temporary IDs
      required: true,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    assignedBy: {
      type: String,
      default: 'system', // Make this optional with a default
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Create a compound index to ensure a user can only be assigned to an event once
organizerEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('OrganizerEvent', organizerEventSchema);
