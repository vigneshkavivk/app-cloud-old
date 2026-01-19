// server/routes/metricsRoutes.js
import express from 'express';
import { getClusterMetrics } from '../controllers/metricsController.js';

const router = express.Router();

// Metrics routes
router.post('/get-cluster-metrics', getClusterMetrics);

export default router;