import express from 'express';
import * as clusterController from '../controllers/clusterController.js';

const router = express.Router();

router.post('/save-data', clusterController.saveClusterData);
router.get('/get-clusters', clusterController.getClusters);
router.get('/get-cluster/:id', clusterController.getClusterById);
router.put('/update-cluster/:id', clusterController.updateCluster);
router.delete('/delete-cluster/:id', clusterController.deleteCluster);
router.get('/get-cluster-credentials/:clusterName', clusterController.getClusterCredentials);
router.delete('/:id', clusterController.deleteCluster);

// 👇 NEW ROUTE 👇
router.get('/get-live-node-count/:clusterId', clusterController.getLiveNodeCount);

export default router;