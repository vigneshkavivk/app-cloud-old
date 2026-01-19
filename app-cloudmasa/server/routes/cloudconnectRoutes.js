// src/backend/routes/cloudconnectionsRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import Connection from '../models/CloudConnectionModel.js'; // Your existing model

const router = express.Router();

// GET /api/cloud-connections → Fetch live AWS accounts for current user
router.get('/', authenticate, async (req, res) => {
  try {
    // Fetch all AWS cloud connections for the logged-in user
    // Assuming your Connection model has:
    // - userId
    // - provider: 'aws'
    // - accountId, accountName, awsRegion
    const awsConnections = await Connection.find({
      userId: req.user.id,
      provider: 'aws' // only AWS accounts
    });

    // Format for frontend dropdown
    const awsAccounts = awsConnections.map(conn => ({
      _id: conn._id.toString(),
      accountId: conn.accountId,
      accountName: conn.accountName || conn.accountId,
      awsRegion: conn.awsRegion || 'unknown',
      status: conn.status || 'Connected'
    }));

    res.status(200).json(awsAccounts);
  } catch (error) {
    console.error('Error fetching AWS accounts:', error);
    res.status(500).json({ error: 'Failed to fetch AWS accounts' });
  }
});

export default router;