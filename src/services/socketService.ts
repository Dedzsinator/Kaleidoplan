import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

// Define notification types
export type NotificationType = 
  | 'event:created' 
  | 'event:updated' 
  | 'event:deleted'
  | 'event:assigned'
  | 'event:unassigned'
  | 'event:liked'
  | 'task:assigned'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  payload: any;
  timestamp: string;
  read: boolean;
}

export type NotificationHandler = (notification: Notification) => void;
const notificationHandlers: NotificationHandler[] = [];

export const initializeSocket = async (): Promise<Socket> => {
  if (!socket) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const baseUrl = apiUrl.replace(/\/api$/, '');
    
    console.log('Connecting to Socket.IO server at:', baseUrl);
    
    socket = io(baseUrl, {
      autoConnect: false,
      reconnectionAttempts: 10,  // Increase reconnection attempts
      reconnection: true,        // Explicitly enable reconnection
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000            // Increase timeout
    });
    
    socket.on('connect', async () => {
      console.log('Socket connected successfully!');
      try {
        const token = await getAuthToken();
        if (token && socket) {
          socket.emit('authenticate', token);
          console.log('Authentication token sent to server');
        } else {
          console.warn('No authentication token available');
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
      }
    });
    
    socket.on('connect_error', (error: unknown) => {
      console.error('Socket connection error details:', error);
    });
    
    socket.on('disconnect', (reason: unknown) => {
      console.log('Socket disconnected:', reason);
      // Auto reconnect if not closed intentionally
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('Attempting to reconnect...');
        socket?.connect();
      }
    });

    socket.on('notification', (data) => {
      console.log('Received notification:', data);
      const notification: Notification = {
        id: crypto.randomUUID(), // Generate unique ID
        ...data,
        read: false,
      };
      
      // Notify all registered handlers
      notificationHandlers.forEach(handler => handler(notification));
    });
    
    socket.connect();
  }
  
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const subscribeToEvent = (eventId: string): void => {
  if (socket && socket.connected) {
    socket.emit('subscribe-to-event', eventId);
  }
};

export const unsubscribeFromEvent = (eventId: string): void => {
  if (socket && socket.connected) {
    socket.emit('unsubscribe-from-event', eventId);
  }
};

export const addNotificationHandler = (handler: NotificationHandler): () => void => {
  notificationHandlers.push(handler);
  
  // Return unsubscribe function
  return () => {
    const index = notificationHandlers.indexOf(handler);
    if (index !== -1) {
      notificationHandlers.splice(index, 1);
    }
  };
};

export const closeSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
