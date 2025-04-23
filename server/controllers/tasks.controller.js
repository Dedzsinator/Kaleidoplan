// Task management controller
const { admin } = require('../config/firebase');
const Task = require('../models/task.model');
const Log = require('../models/log.model');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const mongoose = require('mongoose');

const getAllTasks = async (req, res, next) => {
  try {
    const { eventId, status, assignedTo, priority, sort = 'deadline', limit = 50, page = 1 } = req.query;

    // Build query
    const filter = {};

    if (eventId) {
      // Handle eventId filtering correctly - this is critical for task grouping
      if (mongoose.Types.ObjectId.isValid(eventId)) {
        filter.eventId = mongoose.Types.ObjectId(eventId);
      } else {
        // For string IDs or numerical IDs that aren't ObjectIds
        filter.eventId = eventId;
      }
    }

    if (status) {
      filter.status = status;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (priority) {
      filter.priority = priority;
    }

    // Restrict access based on role - temporarily comment this out for testing
    /*
    if (req.user.role !== 'admin') {
      filter.$or = [{ assignedTo: req.user.uid }, { createdBy: req.user.uid }];
    }
    */

    console.log('Task filter:', JSON.stringify(filter));

    // Execute query with pagination
    const tasks = await Task.find(filter)
      .sort({ [sort.startsWith('-') ? sort.substring(1) : sort]: sort.startsWith('-') ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    console.log(`Found ${tasks.length} tasks matching filter`);

  const formattedTasks = tasks.map(task => {
    const taskObj = task.toObject();
    
    // Handle eventId more safely - some tasks may have invalid references
    if (taskObj.eventId) {
      // Only try to access _id if eventId is an object
      if (typeof taskObj.eventId === 'object') {
        // Some objects might have _id as null or undefined
        if (taskObj.eventId?._id) {
          taskObj.eventId = taskObj.eventId._id.toString();
        } else if (taskObj.eventId?.id) {
          // Try fallback to regular id if _id is not available
          taskObj.eventId = taskObj.eventId.id.toString();
        }
        // If we get here and both are undefined, just leave eventId as is
      }
      // If eventId is already a string or number, no conversion needed
    }
    
    return {
      ...taskObj,
      // Safer version - handle possibly undefined _id
      id: taskObj.id || (taskObj._id ? taskObj._id.toString() : `task-${Math.random().toString(36).substr(2, 9)}`)
    };
  });

    // Get total count
    const totalTasks = await Task.countDocuments(filter);

    // Debug - log the first few tasks
    if (formattedTasks.length > 0) {
      console.log('Sample task:', {
        id: formattedTasks[0].id,
        _id: formattedTasks[0]._id,
        name: formattedTasks[0].name,
        eventId: formattedTasks[0].eventId
      });
    }

    // Return data with pagination info
    res.json({
      tasks: formattedTasks,
      pagination: {
        total: totalTasks,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalTasks / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Try to find task by both _id and id fields
    const task = await Task.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id },
        { id: id }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission
    /*
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.uid && task.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have permission to view this task' });
    }
    */

    // Preserve original ID in response
    const taskObj = task.toObject();
    if (!taskObj.id) {
      taskObj.id = taskObj._id.toString();
    }

    res.json(taskObj);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new task
 */
const createTask = async (req, res, next) => {
  try {
    const { eventId, name, description, deadline, assignedTo, status, priority } = req.body;

    // Validate required fields
    if (!eventId || !name || !deadline) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['eventId', 'name', 'deadline'],
      });
    }

    // Check if event exists
    const eventExists = await Event.exists({ _id: eventId });
    if (!eventExists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create new task
    const newTask = new Task({
      eventId,
      name,
      description,
      deadline: new Date(deadline),
      assignedTo: assignedTo || req.user.uid,
      status: status || 'pending',
      priority: priority || 'medium',
      createdBy: req.user.uid,
    });

    const savedTask = await newTask.save();

    // Create log entry
    const log = new Log({
      taskId: savedTask._id,
      status: savedTask.status,
      changedBy: req.user.uid,
      changedAt: new Date(),
    });

    await log.save();

    res.status(201).json(savedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a task
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, deadline, assignedTo, status, priority } = req.body;

    // Find existing task
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission
    const isAdmin = req.user.role === 'admin';
    const isAssigned = task.assignedTo === req.user.uid;
    const isCreator = task.createdBy === req.user.uid;

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ error: 'You do not have permission to update this task' });
    }

    // Log status change if status is changed
    const statusChanged = status && status !== task.status;

    // Update task
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(deadline && { deadline: new Date(deadline) }),
      ...(assignedTo && { assignedTo }),
      ...(status && { status }),
      ...(priority && { priority }),
      updatedBy: req.user.uid,
    };

    // Handle completion date
    if (status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (status && status !== 'completed' && task.status === 'completed') {
      updateData.completedAt = null;
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    // Create log if status changed
    if (statusChanged) {
      const log = new Log({
        taskId: task._id,
        status,
        changedBy: req.user.uid,
        changedAt: new Date(),
      });

      await log.save();
    }

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find task
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && task.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have permission to delete this task' });
    }

    // Delete task and its logs
    await Task.findByIdAndDelete(id);
    await Log.deleteMany({ taskId: id });

    res.json({ message: 'Task deleted successfully', id });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all task logs
 */
const getTaskLogs = async (req, res, next) => {
  try {
    // Only admin can see all logs
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to view all logs' });
    }

    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get logs with pagination
    const logs = await Log.find().skip(skip).limit(parseInt(limit)).sort({ changedAt: -1 });

    // Get total count
    const totalLogs = await Log.countDocuments();

    res.json({
      logs,
      pagination: {
        total: totalLogs,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalLogs / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs for a specific task
 */
const getTaskLogsByTaskId = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Find task
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.uid && task.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have permission to view logs for this task' });
    }

    // Get logs
    const logs = await Log.find({ taskId }).sort({ changedAt: -1 });

    // Enrich logs with user info
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const logObj = log.toObject();

        try {
          // Get user data from Firebase or MongoDB
          let userData = null;

          try {
            // Try Firebase first
            const userRecord = await admin.auth().getUser(log.changedBy);
            userData = {
              displayName: userRecord.displayName || 'Unknown',
              email: userRecord.email || 'No email',
            };
          } catch (firebaseErr) {
            // Fall back to MongoDB
            const user = await User.findOne({ firebaseUid: log.changedBy });
            if (user) {
              userData = {
                displayName: user.displayName || 'Unknown',
                email: user.email || 'No email',
              };
            }
          }

          return {
            ...logObj,
            user: userData || { displayName: 'Unknown User' },
          };
        } catch (err) {
          return {
            ...logObj,
            user: { displayName: 'Unknown User' },
          };
        }
      }),
    );

    res.json(enrichedLogs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskLogs,
  getTaskLogsByTaskId,
};
