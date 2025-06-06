require('dotenv').config();
import mongoose from 'mongoose';

import admin from '../server/config/firebase';
import User from '../server/models/user.model';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminPassword123';

    // Check if user exists in Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
    } catch (e) {
      console.warn('ID could not be converted to ObjectId, using as string:', e);
      userRecord = await admin.auth().createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'System Admin',
        emailVerified: true,
      });
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // Check if user exists in MongoDB
    let user = await User.findOne({ uid: userRecord.uid });

    if (!user) {
      // Create user in MongoDB
      user = new User({
        uid: userRecord.uid,
        email: adminEmail,
        displayName: 'System Admin',
        role: 'admin',
        lastLogin: new Date(),
      });
      await user.save();
    } else {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      } else {
      }
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

createAdminUser();
