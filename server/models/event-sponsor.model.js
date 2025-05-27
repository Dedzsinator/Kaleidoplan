// Event-Sponsor relationship model
import mongoose from 'mongoose';

const eventSponsorSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor',
      required: true,
    },
    sponsorshipLevel: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'bronze', 'partner'],
      default: 'partner',
    },
    sponsorshipAmount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

// Create index for faster queries
eventSponsorSchema.index({ eventId: 1, sponsorId: 1 }, { unique: true });

const EventSponsor = mongoose.model('EventSponsor', eventSponsorSchema);

module.exports = EventSponsor;
