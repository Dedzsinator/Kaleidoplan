import axios from 'axios';
import { Event } from '../app/models/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Define additional type interfaces to replace 'any'
interface TaskFilter {
  eventId?: string;
  status?: string;
  assignedTo?: string;
  dueDate?: string | Date;
  priority?: string;
  [key: string]: unknown;
}

interface TaskUpdateData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | Date;
  assignedTo?: string;
  completedAt?: string | Date | null;
  [key: string]: unknown;
}

interface TaskLogData {
  taskId: string;
  action: string;
  details?: string;
  timestamp?: Date | string;
  userId?: string;
  changes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface EventFilter {
  id?: string; // Add other specific fields from Event if used for filtering
  name?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isPublic?: boolean;
  status?: string; // e.g., 'upcoming', 'ongoing', 'completed'
  location?: string;
}

let apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const storage = {
  async setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },
  async getItem(key: string) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },
  async removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  },
};

export const setAuthToken = async (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const isApiClientInitialized = () => {
  return !!apiClient;
};

export const generateId = async (): Promise<string> => {
  // Use browser's Web Crypto API if available
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(12);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback to Math.random if Web Crypto API is not available
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const mongoApi = {
  public: {
    getEvents: async (filter: Partial<Event> = {}) => {
      try {
        const response = await publicApiClient.get('/public/events', { params: filter });

        return response.data;
      } catch (error) {
        console.error('Error fetching public events:', error);
        throw error;
      }
    },

    getEventById: async (eventId: string) => {
      try {
        const response = await publicApiClient.get(`/public/events/${eventId}`);

        return response.data;
      } catch (error) {
        console.error(`Error fetching public event ${eventId}:`, error);
        throw error;
      }
    },
  },

  getTasks: async (filter: TaskFilter = {}) => {
    try {
      const response = await apiClient.get('/tasks', { params: filter });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  getTaskById: async (taskId: string) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  },

  updateTask: async (taskId: string, updateData: TaskUpdateData) => {
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  },

  getTaskLogs: async (taskId: string) => {
    try {
      const response = await apiClient.get(`/taskLogs`, { params: { taskId } });
      return response.data;
    } catch (error) {
      console.error(`Error fetching logs for task ${taskId}:`, error);
      throw error;
    }
  },

  createTaskLog: async (logData: TaskLogData) => {
    try {
      const response = await apiClient.post('/taskLogs', logData);
      return response.data;
    } catch (error) {
      console.error('Error creating task log:', error);
      throw error;
    }
  },

  getEvents: async (filter: EventFilter = {}): Promise<Event[]> => {
    try {
      // Pass the EventFilter type directly to the private API endpoint
      const response = await apiClient.get('/events', { params: filter });
      return response.data;
    } catch (error) {
      console.error('Error fetching events with auth:', error);
      try {
        // Use type assertion when calling the public fallback, as it expects Partial<Event>
        return await mongoApi.public.getEvents(filter as Partial<Event>);
      } catch (fallbackError) {
        console.error('Public fallback also failed:', fallbackError);
        throw error; // Re-throw the original error or the fallback error
      }
    }
  },

  getEventById: async (eventId: string) => {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      try {
        return await mongoApi.public.getEventById(eventId);
      } catch (fallbackError) {
        throw error;
      }
    }
  },
};

export const testConnection = async () => {
  try {
    const response = await apiClient.get('/health');

    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

export const initializeAuth = async () => {
  try {
    const token = await storage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }
  } catch (error) {
    console.error('Error loading auth token:', error);
  }
};

initializeAuth();

export { apiClient, publicApiClient };

export default mongoApi;
