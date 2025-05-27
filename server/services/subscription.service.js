import cron from 'node-cron';

import subscriptionController from '../controllers/subscription.controller';

// Schedule weekly updates to run every Monday at 9 AM
const scheduleWeeklyEmails = () => {
  cron.schedule('0 9 * * 1', async () => {
    await subscriptionController.sendWeeklyUpdates();
  });
};

module.exports = {
  scheduleWeeklyEmails,
};
