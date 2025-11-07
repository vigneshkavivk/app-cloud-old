const express = require('express');
const deploymentController = require('../controllers/deploymentController');

const router = express.Router();

// Deployment routes
router.post('/save-deployment', deploymentController.saveDeployment);
router.post('/tools/deploy', deploymentController.deployTool);
router.get('/install-kubectl', deploymentController.installKubectl);
router.delete('/deploy/:toolName', deploymentController.deleteDeploymentByTool);
router.post('/delete', deploymentController.deleteArgoCDApp);

module.exports = router;