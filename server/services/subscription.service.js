const cron = require('node-cron');
const subscriptionController = require('../controllers/subscription.controller');

// Schedule weekly updates to run every Monday at 9 AM
const scheduleWeeklyEmails = () => {
  cron.schedule('0 9 * * 1', async () => {
    await subscriptionController.sendWeeklyUpdates();
  });
};

module.exports = {
  scheduleWeeklyEmails,
};
