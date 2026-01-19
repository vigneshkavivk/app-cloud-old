// server/controllers/notificationcontroller.js
import Notification from '../models/Notification.js';

// ✅ Existing getNotifications (updated to use DB)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const notifications = await Notification
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = notifications.map(notif => ({
      id: notif._id.toString(),
      title: notif.title,
      message: notif.message,
      type: notif.type,
      timestamp: notif.createdAt,
      read: notif.read
    }));

    res.status(200).json({ notifications: formatted });
  } catch (error) {
    console.error('❌ Notification fetch error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

// ✅ NEW: markAsRead handler
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await Notification.updateOne(
      { _id: id, userId },
      { $set: { read: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};
