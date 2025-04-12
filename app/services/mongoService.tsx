import { MongoClient, Db } from 'mongodb';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';

// Get the MongoDB connection URI from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// We'll use a singleton pattern for our API client
let apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public client for requests that don't need authentication
const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage helper that works cross-platform
const storage = {
  async setItem(key: string, value: string) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },
  async getItem(key: string) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },
  async removeItem(key: string) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  }
};

// Set auth token if available
export const setAuthToken = async (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Check if API client is initialized
export const isApiClientInitialized = () => {
  return !!apiClient;
};
// Utility function for generating IDs client-side when needed
export const generateId = async (): Promise<string> => {
  const randomBytes = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString() + new Date().getTime().toString()
  );
  return randomBytes.substring(0, 24);
};

// MongoDB API service methods that communicate with your backend
export const mongoApi = {
  // Public endpoints (no authentication required)
  public: {
    getEvents: async (filter: any = {}) => {
      try {
        console.log('Fetching public events from MongoDB API...');
        const response = await publicApiClient.get('/public/events', { params: filter });
        console.log('Public events response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching public events:', error);
        throw error;
      }
    },

    getEventById: async (eventId: string) => {
      try {
        console.log(`Fetching public event ${eventId} from MongoDB API...`);
        const response = await publicApiClient.get(`/public/events/${eventId}`);
        console.log('Public event response:', response.data);
        return response.data;
      } catch (error) {
        console.error(`Error fetching public event ${eventId}:`, error);
        throw error;
      }
    }
  },

  // Tasks
  getTasks: async (filter: any = {}) => {
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

  updateTask: async (taskId: string, updateData: any) => {
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  },

  // Task Logs
  getTaskLogs: async (taskId: string) => {
    try {
      const response = await apiClient.get(`/taskLogs`, { params: { taskId } });
      return response.data;
    } catch (error) {
      console.error(`Error fetching logs for task ${taskId}:`, error);
      throw error;
    }
  },

  createTaskLog: async (logData: any) => {
    try {
      const response = await apiClient.post('/taskLogs', logData);
      return response.data;
    } catch (error) {
      console.error('Error creating task log:', error);
      throw error;
    }
  },

  // Events
  getEvents: async (filter: any = {}) => {
    try {
      console.log('Fetching events from MongoDB API with auth...');
      const response = await apiClient.get('/events', { params: filter });
      console.log('Events response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching events with auth:', error);
      // Try to fall back to public endpoint
      try {
        console.log('Falling back to public endpoint...');
        return await mongoApi.public.getEvents(filter);
      } catch (fallbackError) {
        console.error('Public fallback also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  },

  getEventById: async (eventId: string) => {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      // Try to fall back to public endpoint
      try {
        return await mongoApi.public.getEventById(eventId);
      } catch (fallbackError) {
        throw error; // Throw the original error
      }
    }
  }
};

export const testConnection = async () => {
  try {
    const response = await apiClient.get('/health');
    console.log('API connection test successful:', response.data);
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

// Load auth token on module init
export const initializeAuth = async () => {
  try {
    const token = await storage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      console.log('Auth token loaded from storage');
    }
  } catch (error) {
    console.error('Error loading auth token:', error);
  }
};

// Initialize auth token on module load
initializeAuth();

export { apiClient, publicApiClient };

export default mongoApi;