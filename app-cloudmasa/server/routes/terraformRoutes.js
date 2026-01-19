// server/routes/terraformRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import * as terraformController from '../controllers/terraformController.js';

const router = express.Router();

// ✅ Correct: use only 'authenticate'
router.post('/deploy', authenticate, terraformController.deploy);
router.get('/logs/:deploymentId', authenticate, terraformController.getLogs);

// ✅ NEW: Routes for Created Resources
// Get all resources created by the authenticated user
router.get('/resources',  terraformController.getResources);

// Destroy a specific resource
// ADD THIS LINE
router.post('/destroy-deployment', terraformController.destroyDeployment);
router.get('/scan-existing', terraformController.scanAndSaveExistingResources);
export default router;

