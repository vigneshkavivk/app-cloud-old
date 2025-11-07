const express = require('express');
const metricsController = require('../controllers/metricsController');

const router = express.Router();

// Metrics routes
router.post('/get-cluster-metrics', metricsController.getClusterMetrics);

module.exports = router;