// server/routes/azureRoutes.js
import express from 'express';
import {
  connectAzure,
  getAzureAccounts,
  deleteAzureAccount,
  validateAzureCredentials,
  validateExistingAccount, // ✅ Now defined & exported
} from '../controllers/azureController.js';
import authenticate from '../middleware/auth.js';


const router = express.Router();

router.post('/connect', authenticate, connectAzure);
router.post('/validate-credentials', authenticate, validateAzureCredentials);
router.get('/accounts', authenticate, getAzureAccounts); // ✅ This is missing!
router.delete('/account/:id', authenticate, deleteAzureAccount);
router.post('/validate-account', authenticate, validateExistingAccount);


export default router;
