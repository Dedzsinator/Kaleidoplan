/**
 * Notification Service to handle real-time notifications
 */
let io;

const initializeNotificationService = (socketIo) => {
  io = socketIo;
};

const sendNotification = (type, payload, target = 'all') => {
  if (!io) {
    console.error('❌ Socket IO not initialized in notification service');
    return;
  }

  const notification = {
    type,
    payload,
    timestamp: new Date(),
  };

  // For event-specific notifications, also send to the event's room
  if (payload && payload.eventId) {
    const eventRoom = `event:${payload.eventId}`;
    io.to(eventRoom).emit('notification', notification);
  }

  // Target specific users or rooms
  if (target === 'all') {
    io.emit('notification', notification);
  } else if (target === 'authenticated') {
    // Count number of clients in the room
    const authenticatedRoom = io.sockets.adapter.rooms.get('authenticated');
    const clientCount = authenticatedRoom ? authenticatedRoom.size : 0;
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

// Add this export statement at the end of the file
module.exports = {
  initializeNotificationService,
  sendNotification,
};
