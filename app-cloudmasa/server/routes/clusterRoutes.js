// server/routes/clusterRoutes.js
import express from 'express';
import * as clusterController from '../controllers/clusterController.js';

const router = express.Router();

// ✅ EKS Cluster Creation (Terraform-backed)
router.post('/create', clusterController.createCluster);

// Cluster Management (Add existing, list, CRUD)
router.post('/save-data', clusterController.saveClusterData);
router.get('/get-clusters', clusterController.getClusters);
router.get('/get-cluster/:id', clusterController.getClusterById);
router.put('/update-cluster/:id', clusterController.updateCluster);
router.patch('/:id', clusterController.updateCluster); // ✅ ADD THIS LINE
router.delete('/delete-cluster/:id', clusterController.deleteCluster);
router.post('/get-upgrade-versions', clusterController.getUpgradeVersions);
router.post('/upgrade-cluster', clusterController.upgradeCluster);                            
// ⚠ Alias for delete (keep both if frontend uses it)                                                                            
router.delete('/:id', clusterController.deleteCluster);
// Add this line to create an alias
router.delete('/delete-cluster/:id', clusterController.deleteCluster);
router.delete('/:id/destroy', clusterController.destroyCluster);
// Credentials & Live Metrics
router.get('/get-cluster-credentials/:clusterName', clusterController.getClusterCredentials);
router.get('/get-live-node-count/:clusterId', clusterController.getLiveNodeCount);

// ───────────────────────────────────────
// ✅ CONFIGURE DASHBOARD: CLUSTER OVERVIEW & METRICS
// ───────────────────────────────────────

// GET /api/clusters/:id/config
router.get('/:id/config', clusterController.getClusterConfig);

// GET /api/clusters/:id/namespaces
router.get('/:id/namespaces', clusterController.getNamespaces);

// GET /api/clusters/:id/workloads
router.get('/:id/workloads', clusterController.getWorkloads);

// GET /api/clusters/:id/services
router.get('/:id/services', clusterController.getServices);

// GET /api/clusters/:id/ingresses
router.get('/:id/ingresses', clusterController.getIngresses);

// GET /api/clusters/:id/metrics
router.get('/:id/metrics', clusterController.getMetrics);

// GET /api/clusters/:id/events
router.get('/:id/events', clusterController.getEvents);
// GET /api/clusters/:id/nodes
router.get('/:id/nodes', clusterController.getNodes);

// GET /api/clusters/:id/pods
router.get('/:id/pods', clusterController.getPods);
// GET /api/clusters/:id/kube-system
router.get('/:id/kube-system', clusterController.getKubeSystemStatus);

export default router;
