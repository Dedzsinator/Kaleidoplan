import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import '../../styles/NotificationCenter.css';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.type === 'event:created' || notification.type === 'event:updated') {
      navigate(`/events/${notification.payload.eventId}`);
    }

    setIsOpen(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {notification.type.startsWith('event') ? '🗓️' : '📢'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {notification.type === 'event:created' && `New event: ${notification.payload.name}`}
                      {notification.type === 'event:updated' && `Event updated: ${notification.payload.name}`}
                      {notification.type === 'event:liked' &&
                        `${notification.payload.userName} ${notification.payload.action === 'added'
                          ? 'liked'
                          : notification.payload.action === 'removed'
                            ? 'removed interest in'
                            : 'updated interest in'
                        } ${notification.payload.name}`}
                      {notification.type === 'system' && notification.payload.message}
                    </div>
                    <div className="notification-time">
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                  <button
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
