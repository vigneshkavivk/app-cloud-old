// server/routes/deploymentRoutes.js
import express from 'express';
import {
  updateArgoCDApplication,
  getArgoCDStatus,
  getClusters,
  getLatestDeployment,
  getDeploymentCount,
  getDeployedInstances,
  getAllDeployments,
  deleteArgoCDApplication,
} from '../controllers/deploymentController.js';

const router = express.Router();

// Apply Argo CD Application (GitOps deployment)
router.post('/apply-argo-app', updateArgoCDApplication);

// Get Argo CD app sync/health status
router.get('/argo-status', getArgoCDStatus);

// Get EKS clusters (filtered by AWS account)
router.get('/clusters/get-clusters', getClusters);

// Get latest deployment for a specific tool
router.get('/latest', getLatestDeployment);

// Get total count of all deployments
router.get('/count', getDeploymentCount);

// Get *all* deployments (used by Dashboard Tools modal)
router.get('/list', getAllDeployments); // ✅ Critical for frontend list view

// Get deployments filtered by toolName
router.get('/instances', getDeployedInstances);

router.delete('/:toolName', deleteArgoCDApplication);

export default router;
