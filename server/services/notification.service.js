/**
 * Notification Service to handle real-time notifications
 */
let io;

const initializeNotificationService = (socketIo) => {
  io = socketIo;
};

const sendNotification = (type, payload, target = 'all') => {
  if (!io) {
    console.error('Socket IO not initialized in notification service');
    return;
  }

  const notification = {
    type,
    payload,
    timestamp: new Date(),
  };

  // Target specific users or rooms
  if (target === 'all') {
    io.emit('notification', notification);
  } else if (target === 'authenticated') {
    io.to('authenticated').emit('notification', notification);
  } else if (target === 'admins') {
    io.to('admins').emit('notification', notification);
  } else if (target === 'organizers') {
    io.to('organizers').emit('notification', notification);
  } else if (target.startsWith('user:')) {
    io.to(target).emit('notification', notification);
  }

  return notification;
};

module.exports = {
  initializeNotificationService,
  sendNotification,
};
