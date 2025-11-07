// server/routes/inviteRoutes.js
import express from 'express';
import { sendInvite, getAllInvitedUsers, deleteInvitedUser } from '../controllers/inviteController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/send-email', authenticate, sendInvite);
router.get('/invited-users', authenticate, getAllInvitedUsers);
router.delete('/invited-users/:id', authenticate, deleteInvitedUser);

export default router;