import mongoose from 'mongoose';

import User from '../server/models/user.model';
import Event from '../server/models/event.model';
// import Task from '../server/models/task.model';
// import admin from '../server/config/firebase';
require('dotenv').config();

async function generateDummyData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Generate events
    for (let i = 0; i < 15; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) - 10);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);

      const status = startDate > new Date() ? 'upcoming' : endDate < new Date() ? 'completed' : 'ongoing';

      await Event.create({
        name: `Test Event ${i + 1}`,
        description: `This is a test event #${i + 1}`,
        startDate,
        endDate,
        location: `Location ${i + 1}`,
        status,
        isPublic: Math.random() > 0.3,
      });
    }

    // Update lastLogin dates randomly for users
    const users = await User.find();
    for (const user of users) {
      const lastLogin = new Date();
      lastLogin.setDate(lastLogin.getDate() - Math.floor(Math.random() * 30));

      user.lastLogin = lastLogin;
      await user.save();
    }
  } catch (error) {
    console.error('Error generating dummy data:', error);
  } finally {
    mongoose.disconnect();
  }
}

generateDummyData();
