import React, { createContext, useContext, useEffect, useState } from 'react';
import { addNotificationHandler, initializeSocket, Notification } from '@services/socketService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  deleteNotification: (id: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'failed';
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');

  useEffect(() => {
    // Initialize socket connection with better error handling
    const initSocket = async () => {
      try {
        setConnectionStatus('connecting');
        await initializeSocket();
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Failed to initialize socket:', err);
        setConnectionStatus('failed');
        // Continue execution - the app should work without notifications
      }
    };

    initSocket();

    // Subscribe to notifications only if initialization succeeded
    const unsubscribe = addNotificationHandler((notification: Notification) => {
      setNotifications((prev) => {
        const newState = [notification, ...prev].slice(0, 100); // Keep max 100 notifications
        return newState;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
    connectionStatus,
  };

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
