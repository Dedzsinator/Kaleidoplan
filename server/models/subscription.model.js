import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email address'],
    },
    subscriptionDate: {
      type: Date,
      default: Date.now,
    },
    eventIds: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastEmailSent: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      default: 'website',
    },
    confirmationToken: {
      type: String,
      default: null,
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
