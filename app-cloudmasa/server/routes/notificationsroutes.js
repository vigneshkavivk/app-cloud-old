// server/routes/notificationsroutes.js
import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationcontroller.js';
import authenticate from '../middleware/auth.js'; // ✅ now imports the fixed version

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markAsRead); // ✅ markAsRead receives req.user.id ✅

export default router;
