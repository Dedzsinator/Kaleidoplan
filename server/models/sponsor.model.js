// Sponsor model for organizations sponsoring events
import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sponsor name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    contactName: String,
    contactEmail: String,
    contactPhone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

// Create text search indexes
sponsorSchema.index({
  name: 'text',
  description: 'text',
});

const Sponsor = mongoose.model('Sponsor', sponsorSchema);

module.exports = Sponsor;
