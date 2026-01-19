const express = require('express');
const awsController = require('../controllers/awsController');

const router = express.Router();

// AWS routes
router.post('/validate-aws-credentials', awsController.validateAWSCredentials);
router.post('/connect-to-aws', awsController.connectToAWS);
router.get('/get-aws-accounts', awsController.getAWSAccounts);
router.post('/get-eks-clusters', awsController.getEKSClusters);
router.delete('/remove-aws-account/:accountId', awsController.removeAWSAccount);
router.post('/configure-aws', awsController.configureAWSCredentials);
router.post('/verify-credentials', awsController.verifyAWSCredentials);
router.post('/save-config', awsController.saveAWSConfig);

// ✅ ADD THIS LINE — for saving clusters to DB
router.post('/save-data', awsController.saveData);

module.exports = router;