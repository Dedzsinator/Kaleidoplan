const cron = require('node-cron');
const subscriptionController = require('../controllers/subscription.controller');

// Schedule weekly updates to run every Monday at 9 AM
const scheduleWeeklyEmails = () => {
  console.log('Scheduling weekly email updates...');
  
  cron.schedule('0 9 * * 1', async () => {
    console.log('Running weekly email update job');
    await subscriptionController.sendWeeklyUpdates();
  });
};

module.exports = {
  scheduleWeeklyEmails,
};
