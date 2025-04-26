// Task model for event-related tasks
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      index: true, // Add index for faster lookups
    },
    eventId: {
      type: mongoose.Schema.Types.Mixed, // Allow for both String and ObjectId
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true, // Add index for faster lookups
    },
    name: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Task deadline is required'],
    },
    assignedTo: {
      type: String,
      required: [true, 'Task must be assigned to someone'],
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    createdBy: String,
    updatedBy: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    completedAt: Date,
  },
  { timestamps: true },
);

// Create indexes for faster queries
taskSchema.index({ eventId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ deadline: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
