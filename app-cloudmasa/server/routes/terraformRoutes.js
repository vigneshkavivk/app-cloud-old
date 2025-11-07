// server/routes/terraformRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import * as terraformController from '../controllers/terraformController.js';

const router = express.Router();

// ✅ Correct: use only 'authenticate'
router.post('/deploy', authenticate, terraformController.deploy);
router.get('/logs/:deploymentId', authenticate, terraformController.getLogs);

export default router;
