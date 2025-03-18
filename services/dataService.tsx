import { Task, TaskLog } from '../models/types';
import { taskApi, taskLogApi } from './api';
import mongoApi from './mongoService';

// Get tasks for a specific organizer
export async function getTasksByOrganizer(firebaseUid: string): Promise<Task[]> {
  try {
    return await taskApi.getTasksByOrganizer(firebaseUid);
  } catch (error) {
    console.error('Error in getTasksByOrganizer:', error);
    return [];
  }
}

// Update task status
export async function updateTaskStatus(
  taskId: string, 
  newStatus: 'pending' | 'in-progress' | 'completed',
  firebaseUid: string,
  comment?: string
): Promise<void> {
  try {
    return await taskApi.updateTaskStatus(taskId, newStatus, firebaseUid, comment);
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    throw error;
  }
}

// Get task logs
export async function getTaskLogs(taskId: string): Promise<TaskLog[]> {
  try {
    return await taskLogApi.getTaskLogs(taskId);
  } catch (error) {
    console.error('Error in getTaskLogs:', error);
    return [];
  }
}

// Get task by ID
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    return await taskApi.getTaskById(taskId);
  } catch (error) {
    console.error('Error in getTaskById:', error);
    return null;
  }
}

// Export the mongoApi for direct access to MongoDB operations
export { mongoApi };