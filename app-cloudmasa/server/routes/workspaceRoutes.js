// server/routes/workspaceRoutes.js
import express from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, workspaceController.createWorkspace);
router.get('/', authenticate, workspaceController.getWorkspaces);
router.delete('/:id', authenticate, workspaceController.deleteWorkspace);

// ✅ Required for Policies page
router.get('/:id/members', authenticate, workspaceController.getMembers);
router.put('/:id/members/:userId/role', authenticate, workspaceController.updateMemberRole);
router.delete('/:id/members/:userId', authenticate, workspaceController.removeMember); // 👈 ADD THIS

export default router;
