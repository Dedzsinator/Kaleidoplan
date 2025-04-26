const User = require('../models/user.model');
const Event = require('../models/event.model');
const OrganizerEvent = require('../models/organizer-event.model');
const admin = require('../config/firebase');
const moment = require('moment');
const mongoose = require('mongoose');

// Get overall system statistics
exports.getStats = async (req, res) => {
  try {
    // Get basic counts
    const usersCount = await User.countDocuments();
    const organizersCount = await User.countDocuments({ role: 'organizer' });
    const newUsersCount = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // Get event statistics
    const eventsCount = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({
      startDate: { $gt: new Date() },
    });
    const ongoingEvents = await Event.countDocuments({
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    // Calculate user growth (comparing to previous month)
    const lastMonthCount = await User.countDocuments({
      createdAt: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const growth = lastMonthCount === 0 ? 100 : Math.round(((usersCount - lastMonthCount) / lastMonthCount) * 100);

    // Simple task stats for now (can expand later)
    const taskStats = {
      completed: 45, // Placeholder values
      pending: 23,
      overdue: 7,
      total: 75,
      completionRate: 60,
    };

    res.status(200).json({
      events: {
        total: eventsCount,
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        percentage: eventsCount ? Math.round((upcomingEvents / eventsCount) * 100) : 0,
      },
      tasks: taskStats,
      users: {
        total: usersCount,
        organizers: organizersCount,
        new: newUsersCount,
        growth,
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Get login activity (last 30 days)
exports.getLoginActivity = async (req, res) => {
  try {
    // Generate dates for last 30 days
    const activity = [];
    for (let i = 29; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');

      // Get login count for this date
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const count = await User.countDocuments({
        lastLogin: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      });

      activity.push({
        date,
        count,
      });
    }

    res.status(200).json({ activity });
  } catch (error) {
    console.error('Error getting login activity:', error);
    res.status(500).json({ error: 'Failed to fetch login activity' });
  }
};

// Get active users (logged in within the last 24 hours)
exports.getActiveUsers = async (req, res) => {
  try {
    const activeTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const users = await User.find({
      lastLogin: { $gte: activeTime },
    })
      .sort({ lastLogin: -1 })
      .limit(10);

    res.status(200).json({ users });
  } catch (error) {
    console.error('Error getting active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
};

exports.getOrganizerAssignments = async (req, res) => {
  try {
    // Get all organizer-event relationships
    const organizerEvents = await OrganizerEvent.find({});

    // Group by eventId and include both _id and string id versions
    const assignments = {};

    organizerEvents.forEach((assignment) => {
      try {
        // Get the event ID - add toString() to ensure consistent format
        const eventId = assignment.eventId ? assignment.eventId.toString() : '';

        if (eventId) {
          if (!assignments[eventId]) {
            assignments[eventId] = [];
          }

          if (!assignments[eventId].includes(assignment.userId)) {
            assignments[eventId].push(assignment.userId);
          }
        }
      } catch (err) {
        console.error('Error processing assignment:', err);
      }
    });

    res.status(200).json({
      assignments,
    });
  } catch (error) {
    console.error('Error getting organizer assignments:', error);
    res.status(500).json({ error: 'Failed to get organizer assignments' });
  }
};
