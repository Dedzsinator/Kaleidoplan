import mongoose from 'mongoose';

const eventInterestSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    eventId: {
      type: String,
      required: true,
    },
    interestLevel: {
      type: String,
      enum: ['interested', 'attending'],
      default: 'interested',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Create a compound index to ensure a user can only have one interest level per event
eventInterestSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('EventInterest', eventInterestSchema);
