require('dotenv').config();
const admin = require('../server/config/firebase');
const mongoose = require('mongoose');
const User = require('../server/models/user.model');

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminPassword123';
    
    // Check if user exists in Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
      console.log('Admin user already exists in Firebase');
    } catch (error) {
      // Create user if not exists
      userRecord = await admin.auth().createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'System Admin',
        emailVerified: true
      });
      console.log('Created admin user in Firebase');
    }
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('Set admin role in Firebase custom claims');
    
    // Check if user exists in MongoDB
    let user = await User.findOne({ uid: userRecord.uid });
    
    if (!user) {
      // Create user in MongoDB
      user = new User({
        uid: userRecord.uid,
        email: adminEmail,
        displayName: 'System Admin',
        role: 'admin',
        lastLogin: new Date()
      });
      await user.save();
      console.log('Created admin user in MongoDB');
    } else {
      // Update role to admin if not already
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log('Updated user to admin role in MongoDB');
      } else {
        console.log('Admin user already exists in MongoDB');
      }
    }
    
    console.log('Admin user setup complete!');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: [the password you specified]');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

createAdminUser();