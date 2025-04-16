require('dotenv').config();
const admin = require('../server/config/firebase');

async function resetAdminPassword() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const newPassword = process.env.NEW_ADMIN_PASSWORD || '';
    
    // Get the user record
    const userRecord = await admin.auth().getUserByEmail(adminEmail);
    console.log(`Found admin user: ${userRecord.email}`);
    
    // Update the password
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });
    
    console.log('Password reset successful!');
    console.log(`Email: ${adminEmail}`);
    console.log(`New Password: ${newPassword}`);
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    process.exit();
  }
}

resetAdminPassword();