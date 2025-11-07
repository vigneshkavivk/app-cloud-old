// server/utils/cleanupInactiveUsers.js
import cron from 'node-cron';
import Register from '../models/RegisterModel.js';

// Run every 1 minute to mark inactive users
cron.schedule('* * * * *', async () => {
  try {
    const timeoutMinutes = 5; // Adjust as needed (e.g., 5 mins)
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const result = await Register.updateMany(
      {
        lastActive: { $lt: cutoffTime },
        isActive: true
      },
      { isActive: false }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Marked ${result.modifiedCount} user(s) as inactive. Last active before: ${cutoffTime}`);
    }
  } catch (error) {
    console.error('❌ Error in cleanupInactiveUsers cron job:', error);
  }
});

console.log('Intialized user inactivity cleanup job (runs every minute)');
