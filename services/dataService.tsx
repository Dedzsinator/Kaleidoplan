import { connectToDatabase } from './mongoService.tsx';
import { Task, TaskLog } from '../models/types';
import { ObjectId } from 'mongodb';

// Get tasks for a specific organizer
export async function getTasksByOrganizer(organizerId: string): Promise<Task[]> {
  try {
    const { db } = await connectToDatabase();
    
    // Get tasks assigned to this organizer
    const tasks = await db.collection('tasks')
      .find({ assignedTo: organizerId })
      .toArray();
    
    // Get event details for each task
    const eventIds = [...new Set(tasks.map(task => task.eventId))];
    const events = await db.collection('events')
      .find({ _id: { $in: eventIds.map(id => new ObjectId(id)) } })
      .toArray();
    
    // Map events to a dictionary for quick lookup
    const eventMap = events.reduce((map, event) => {
      map[event._id.toString()] = event;
      return map;
    }, {});
    
    // Enhance task objects with event names
    return tasks.map(task => ({
      taskId: task._id.toString(),
      name: task.name,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      assignedTo: task.assignedTo,
      eventId: task.eventId,
      eventName: eventMap[task.eventId]?.name || 'Unknown Event',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

// Get task details by ID
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const { db } = await connectToDatabase();
    
    const task = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });
    
    if (!task) return null;
    
    // Get event details
    const event = await db.collection('events').findOne({ _id: new ObjectId(task.eventId) });
    
    return {
      taskId: task._id.toString(),
      name: task.name,
      description: task.description,
      deadline: task.deadline,
      status: task.status,
      assignedTo: task.assignedTo,
      eventId: task.eventId,
      eventName: event?.name || 'Unknown Event',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
}

// Update task status
export async function updateTaskStatus(
  taskId: string, 
  newStatus: 'pending' | 'in-progress' | 'completed',
  userId: string,
  comment?: string
): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    
    // Get current task to determine old status
    const task = await db.collection('tasks').findOne({ _id: new ObjectId(taskId) });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    const oldStatus = task.status;
    
    // Update task status
    await db.collection('tasks').updateOne(
      { _id: new ObjectId(taskId) },
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date()
        } 
      }
    );
    
    // Create a log entry
    const logEntry = {
      taskId: taskId,
      timestamp: new Date(),
      action: newStatus === 'completed' ? 'completed' : 'updated',
      comment: comment,
      updatedBy: userId,
      oldStatus: oldStatus,
      newStatus: newStatus
    };
    
    await db.collection('taskLogs').insertOne(logEntry);
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

// Get task logs
export async function getTaskLogs(taskId: string): Promise<TaskLog[]> {
  try {
    const { db } = await connectToDatabase();
    
    const logs = await db.collection('taskLogs')
      .find({ taskId: taskId })
      .sort({ timestamp: -1 }) // Most recent first
      .toArray();
    
    return logs.map(log => ({
      id: log._id.toString(),
      taskId: log.taskId,
      timestamp: log.timestamp,
      action: log.action,
      comment: log.comment,
      updatedBy: log.updatedBy,
      oldStatus: log.oldStatus,
      newStatus: log.newStatus
    }));
  } catch (error) {
    console.error('Error fetching task logs:', error);
    throw error;
  }
}