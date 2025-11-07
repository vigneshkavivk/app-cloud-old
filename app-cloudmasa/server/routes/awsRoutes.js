// server/routes/awsRoutes.js
import express from 'express';
import * as awsController from '../controllers/awsController.js';

const router = express.Router();

router.post('/connect-to-aws', awsController.connectToAWS);
router.get('/get-aws-accounts', awsController.getAWSAccounts);
router.post('/get-eks-clusters', awsController.getEksClusters);
router.post('/get-vpcs', awsController.getVpcs);
router.post('/get-pricing', awsController.getPricing);
router.delete('/remove-aws-account/:accountId', awsController.removeAWSAccount);

export default router;
