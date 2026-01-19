// server/routes/awsRoutes.js
import express from 'express';
import * as awsController from '../controllers/awsController.js';
import { getInstanceTypes } from '../controllers/awsController.js';
import authenticate from '../middleware/auth.js';
import { getAvailabilityZones } from '../controllers/awsController.js';


const router = express.Router();

// AWS Credential Validation
router.post('/validate-credentials', awsController.validateAWSCredentials);

// Connect AWS Account
router.post('/connect', awsController.connectToAWS);

// List Connected AWS Accounts
router.get('/get-aws-accounts', awsController.getAWSAccounts);

// Remove AWS Account (by MongoDB _id)
router.delete('/account/:_id', awsController.removeAWSAccount);

// Fetch VPCs
router.post('/get-vpcs', awsController.getVpcs);

// Fetch all live resources in AWS account
router.get('/account-resources', awsController.getAccountResources);
// Fetch EKS Clusters
router.post('/eks-clusters', awsController.getEksClusters);

router.post('/instance-types', authenticate, getInstanceTypes);
router.post('/amis', authenticate, awsController.getAmis);
router.post('/key-pairs', authenticate, awsController.getKeyPairs);

router.post('/availability-zones', authenticate, getAvailabilityZones);

// Fetch Live Pricing
router.post('/pricing', awsController.getPricing);

export default router;

