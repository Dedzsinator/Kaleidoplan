// MongoDB service for common database operations
// import mongoose from 'mongoose';

import Event from '../models/event.model';
import Task from '../models/task.model';
import User from '../models/user.model';
import Sponsor from '../models/sponsor.model';
import EventSponsor from '../models/event-sponsor.model';
import Log from '../models/log.model';
import Playlist from '../models/playlist.model';

/**
 * Get statistics for admin dashboard
 */
const getStats = async () => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Stats calculations
    const [
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalUsers,
      newUsers,
      totalOrganizers,
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ startDate: { $gt: now } }),
      Event.countDocuments({
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({
        status: { $ne: 'completed' },
        deadline: { $lt: now },
      }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      User.countDocuments({ role: 'organizer' }),
    ]);

    return {
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        percentage: totalEvents > 0 ? Math.round(((upcomingEvents + ongoingEvents) / totalEvents) * 100) : 0,
      },
      tasks: {
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        total: completedTasks + pendingTasks,
        completionRate:
          completedTasks + pendingTasks > 0 ? Math.round((completedTasks / (completedTasks + pendingTasks)) * 100) : 0,
      },
      users: {
        total: totalUsers,
        new: newUsers,
        organizers: totalOrganizers,
        growth: totalUsers > 0 ? Math.round((newUsers / totalUsers) * 100) : 0,
      },
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
};

/**
 * Import data from CSV
 */
const importFromCSV = async (data, collection) => {
  try {
    let model;
    switch (collection) {
      case 'events':
        model = Event;
        break;
      case 'tasks':
        model = Task;
        break;
      case 'users':
        model = User;
        break;
      case 'sponsors':
        model = Sponsor;
        break;
      case 'eventSponsors':
        model = EventSponsor;
        break;
      case 'logs':
        model = Log;
        break;
      case 'playlists':
        model = Playlist;
        break;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }

    // Insert many with ordered: false to continue on errors
    const result = await model.insertMany(data, { ordered: false });
    return {
      success: true,
      inserted: result.length,
      collection,
    };
  } catch (error) {
    // If the error was a bulk write error, some documents may have been inserted
    if (error.name === 'BulkWriteError') {
      return {
        success: false,
        inserted: error.insertedDocs?.length || 0,
        failed: error.writeErrors?.length || 0,
        collection,
        error: error.message,
      };
    }

    console.error(`Error importing ${collection}:`, error);
    throw error;
  }
};

module.exports = {
  getStats,
  importFromCSV,
};
