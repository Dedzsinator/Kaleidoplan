import { io, Socket } from 'socket.io-client';
import { Notification } from '@models/types';
import { auth } from '@app/config/firebase'; // Import Firebase auth

// Re-export the Notification type from models
export type { Notification };

// Notification handler type
type NotificationHandler = (notification: Notification) => void;
const notificationHandlers: NotificationHandler[] = [];

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private connectionPromise: Promise<Socket> | null = null;

  // Initialize socket only when needed, not immediately
  private initializeSocket(): boolean {
    if (this.socket) return true;

    try {
      // Fix: Extract just the base URL without the /api path
      const apiBaseUrl = process.env.REACT_APP_API_URL
        ? process.env.REACT_APP_API_URL.replace('/api', '')
        : 'http://localhost:3000';

      this.socket = io(apiBaseUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        path: '/socket.io/', // Make the path explicit
        transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
      });

      this.socket.on('connect', () => {
        this.connected = true;

        // Authenticate socket connection when user is logged in
        this.authenticateSocket();
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {});

      this.socket.on('error', (error) => {});

      // Listen for authentication confirmation
      this.socket.on('authenticated', (data) => {});

      // Set up notification listener
      this.socket.on('notification', (notification: any) => {
        // Add an ID if it doesn't have one
        if (!notification.id) {
          notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Set read status if not set
        if (notification.read === undefined) {
          notification.read = false;
        }

        // Ensure payload exists
        if (!notification.payload) {
          notification.payload = {};
        }

        // Ensure timestamp exists
        if (!notification.timestamp) {
          notification.timestamp = new Date().toISOString();
        }

        // Call all registered handlers
        notificationHandlers.forEach((handler) => handler(notification as Notification));
      });

      return true;
    } catch (error) {
      console.error('❌ Error initializing socket:', error);
      return false;
    }
  }

  // Add authentication method to send token to server
  private async authenticateSocket() {
    if (!this.socket || !this.connected) {
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        this.socket.emit('authenticate', token);
      } else {
      }
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
    }
  }

  // Get socket instance
  public async getSocket(): Promise<Socket> {
    if (this.socket && this.connected) {
      return this.socket;
    }

    if (!this.socket) {
      if (!this.initializeSocket()) {
        throw new Error('Failed to initialize socket connection');
      }
    }

    if (!this.connected && this.socket) {
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          return reject(new Error('Socket not initialized'));
        }

        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timed out'));
        }, 5000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          resolve(this.socket!);
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Socket connection error: ${error.message}`));
        });
      });
    }

    return this.socket!;
  }

  // Method to manually subscribe to event updates
  public subscribeToEvent(eventId: string) {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe-to-event', eventId);
      return true;
    }
    return false;
  }

  // Method to unsubscribe from event updates
  public unsubscribeFromEvent(eventId: string) {
    if (this.socket && this.connected) {
      this.socket.emit('unsubscribe-from-event', eventId);
      return true;
    }
    return false;
  }

  // Manually try to reconnect
  public reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }
}

const socketService = new SocketService();

// Update initializeSocket to gracefully handle guest mode
export const initializeSocket = async (): Promise<void> => {
  try {
    await socketService.getSocket();
  } catch (error) {
    // Log but don't throw - allow app to continue working without notifications
    console.warn(
      '⚠️ Socket initialization skipped, continuing in limited mode:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
};

// Export functions required by NotificationContext
export const addNotificationHandler = (handler: NotificationHandler): (() => void) => {
  notificationHandlers.push(handler);

  // Return unsubscribe function
  return () => {
    const index = notificationHandlers.indexOf(handler);
    if (index !== -1) {
      notificationHandlers.splice(index, 1);
    }
  };
};

// Export event subscription functions
export const subscribeToEvent = (eventId: string): boolean => {
  return socketService.subscribeToEvent(eventId);
};

export const unsubscribeFromEvent = (eventId: string): boolean => {
  return socketService.unsubscribeFromEvent(eventId);
};

// Export manual reconnect function
export const reconnectSocket = (): void => {
  socketService.reconnect();
};

// Export the default instance
export default socketService;
