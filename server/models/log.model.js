// Log model for task status changes
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    required: true
  },
  changedBy: {
    type: String,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

// Create index for faster queries
logSchema.index({ taskId: 1 });
logSchema.index({ changedAt: 1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;