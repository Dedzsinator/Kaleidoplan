import axios from 'axios';
import { Task, TaskLog } from '../app/models/types';
import { getAuth } from 'firebase/auth';

// Create API client
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Task and TaskLog API calls
export const taskApi = {
  /**
   * Get tasks assigned to a specific organizer
   */
  getTasksByOrganizer: async (firebaseUid: string): Promise<Task[]> => {
    try {
      const response = await apiClient.get('/tasks', {
        params: { assignedTo: firebaseUid }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks by organizer:', error);
      throw error;
    }
  },

  /**
   * Get a specific task by ID
   */
  getTaskById: async (taskId: string): Promise<Task | null> => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching task by ID:', error);
      throw error;
    }
  },

  /**
   * Update a task's status
   */
  updateTaskStatus: async (
    taskId: string,
    newStatus: 'pending' | 'in-progress' | 'completed',
    firebaseUid: string,
    comment?: string
  ): Promise<void> => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, {
        status: newStatus,
        updatedBy: firebaseUid
      });

      // Create a task log for this status change
      await taskLogApi.createTaskLog({
        taskId,
        action: newStatus === 'completed' ? 'completed' : 'updated',
        updatedBy: firebaseUid,
        oldStatus: null, // The server will look up the old status
        newStatus,
        comment
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
};

export const taskLogApi = {
  /**
   * Get logs for a specific task
   */
  getTaskLogs: async (taskId: string): Promise<TaskLog[]> => {
    try {
      const response = await apiClient.get('/taskLogs', {
        params: { taskId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      throw error;
    }
  },

  /**
   * Create a new task log entry
   */
  createTaskLog: async (logData: {
    taskId: string;
    action: 'created' | 'updated' | 'completed';
    updatedBy: string;
    oldStatus?: 'pending' | 'in-progress' | 'completed' | null;
    newStatus: 'pending' | 'in-progress' | 'completed';
    comment?: string;
  }): Promise<TaskLog> => {
    try {
      const response = await apiClient.post('/taskLogs', {
        ...logData,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating task log:', error);
      throw error;
    }
  }
};

export default {
  task: taskApi,
  taskLog: taskLogApi
};