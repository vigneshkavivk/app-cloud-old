const express = require('express');
const clusterController = require('../controllers/clusterController');

const router = express.Router();

// Cluster routes
router.post('/save-data', clusterController.saveClusterData);
router.get('/get-clusters', clusterController.getClusters);
router.get('/get-cluster/:id', clusterController.getClusterById);
router.put('/update-cluster/:id', clusterController.updateCluster);
router.delete('/delete-cluster/:id', clusterController.deleteCluster);
router.get('/get-cluster-credentials/:clusterName', clusterController.getClusterCredentials);

module.exports = router;