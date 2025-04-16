const User = require('../models/user.model');
const Event = require('../models/event.model');
const Task = require('../models/task.model'); // If you have a task model
const admin = require('../config/firebase');
const mongoose = require('mongoose');
const moment = require('moment');

// Get overall system statistics
exports.getStats = async (req, res) => {
  try {
    // 1. Get events statistics
    const eventStats = await Event.aggregate([
      {
        $facet: {
          'total': [{ $count: 'count' }],
          'upcoming': [
            { $match: { startDate: { $gt: new Date() } } },
            { $count: 'count' }
          ],
          'ongoing': [
            { 
              $match: { 
                $and: [
                  { startDate: { $lte: new Date() } },
                  { endDate: { $gte: new Date() } }
                ]
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    // 2. Get user statistics
    const userStats = await User.aggregate([
      {
        $facet: {
          'total': [{ $count: 'count' }],
          'organizers': [
            { $match: { role: 'organizer' } },
            { $count: 'count' }
          ],
          'new': [
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    // 3. Get task statistics (if you have tasks)
    let taskStats = {
      completed: 0,
      pending: 0,
      overdue: 0,
      total: 0,
      completionRate: 0
    };

    try {
      // Only run this if you have tasks set up
      if (mongoose.modelNames().includes('Task')) {
        const taskAgg = await Task.aggregate([
          {
            $facet: {
              'total': [{ $count: 'count' }],
              'completed': [
                { $match: { status: 'completed' } },
                { $count: 'count' }
              ],
              'pending': [
                { $match: { status: 'pending' } },
                { $count: 'count' }
              ],
              'overdue': [
                { 
                  $match: { 
                    $and: [
                      { dueDate: { $lt: new Date() } },
                      { status: { $ne: 'completed' } }
                    ]
                  }
                },
                { $count: 'count' }
              ]
            }
          }
        ]);

        taskStats = {
          total: taskAgg[0].total[0]?.count || 0,
          completed: taskAgg[0].completed[0]?.count || 0,
          pending: taskAgg[0].pending[0]?.count || 0,
          overdue: taskAgg[0].overdue[0]?.count || 0,
          completionRate: taskAgg[0].total[0]?.count 
            ? Math.round((taskAgg[0].completed[0]?.count || 0) / taskAgg[0].total[0].count * 100) 
            : 0
        };
      }
    } catch (err) {
      console.error('Error getting task stats:', err);
      // Continue anyway since this is just part of the dashboard
    }

    // Calculate growth (percentage change in users in last month)
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    const currentUsers = userStats[0].total[0]?.count || 0;
    const growth = lastMonthUsers > 0 
      ? Math.round(((currentUsers - lastMonthUsers) / lastMonthUsers) * 100) 
      : 100;

    res.status(200).json({
      events: {
        total: eventStats[0].total[0]?.count || 0,
        upcoming: eventStats[0].upcoming[0]?.count || 0,
        ongoing: eventStats[0].ongoing[0]?.count || 0,
        percentage: eventStats[0].total[0]?.count 
          ? Math.round((eventStats[0].upcoming[0]?.count || 0) / eventStats[0].total[0].count * 100) 
          : 0
      },
      tasks: taskStats,
      users: {
        total: userStats[0].total[0]?.count || 0,
        organizers: userStats[0].organizers[0]?.count || 0,
        new: userStats[0].new[0]?.count || 0,
        growth: growth
      }
    });

  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
};

// Get login activity (last 30 days)
exports.getLoginActivity = async (req, res) => {
  try {
    // Get dates for the last 30 days
    const dates = [];
    for (let i = 0; i < 30; i++) {
      dates.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    // Get login activity from MongoDB
    const loginData = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format data for chart
    const activity = dates.map(date => {
      const found = loginData.find(item => item._id === date);
      return {
        date: date,
        count: found ? found.count : 0
      };
    }).reverse(); // Most recent dates first

    res.status(200).json({ activity });
  } catch (error) {
    console.error('Error getting login activity:', error);
    res.status(500).json({ error: 'Failed to retrieve login activity data' });
  }
};

// Get active users
exports.getActiveUsers = async (req, res) => {
  try {
    // Define "active" as users who logged in within the last 24 hours
    const activeTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const users = await User.find(
      { lastLogin: { $gte: activeTime } },
      { 
        _id: 1, 
        uid: 1,
        email: 1,
        displayName: 1,
        role: 1,
        lastLogin: 1,
        photoURL: 1,
        createdAt: 1
      }
    ).sort({ lastLogin: -1 }).limit(10);

    res.status(200).json({ users });
  } catch (error) {
    console.error('Error getting active users:', error);
    res.status(500).json({ error: 'Failed to retrieve active users data' });
  }
};