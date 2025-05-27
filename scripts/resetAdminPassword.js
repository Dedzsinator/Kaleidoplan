require('dotenv').config();
import admin from '../server/config/firebase';

async function resetAdminPassword() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const newPassword = process.env.NEW_ADMIN_PASSWORD || '';

    // Get the user record
    const userRecord = await admin.auth().getUserByEmail(adminEmail);

    // Update the password
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    process.exit();
  }
}

resetAdminPassword();
