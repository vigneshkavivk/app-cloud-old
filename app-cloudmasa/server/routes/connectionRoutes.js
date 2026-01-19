// routes/connectionRoutes.js — Pure ESM version
import express from 'express';
import authenticate from '../middleware/auth.js';
import * as connectionController from '../controllers/connectionController.js';
import Connection from '../models/ConnectionModel.js';

const router = express.Router();

// GET /api/connections/saved-repos?userId=...&accountType=...
router.get('/saved-repos', async (req, res) => {
  const { userId, accountType } = req.query;

  if (!userId || !accountType) {
    return res.status(400).json({ error: 'userId and accountType are required' });
  }

  try {
    const connections = await Connection.find({
      userId,
      accountType,
    }).select('repo').distinct('repo');

    res.status(200).json(connections);
  } catch (err) {
    console.error('Error fetching saved repos:', err);
    res.status(500).json({ error: 'Failed to fetch saved repos' });
  }
});

// GET /api/connections?userId=...
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const connections = await Connection.find({ userId }).sort({ lastSync: -1 });
    res.status(200).json(connections);
  } catch (err) {
    console.error('❌ Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// POST /api/connections/save-default
router.post('/save-default', authenticate, async (req, res) => {
  try {
    console.log("🟩 [SAVE-DEFAULT] Received Body:", req.body);
    const { userId, accountType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!accountType) {
      return res.status(400).json({ error: 'Account Type is required' });
    }

    await connectionController.saveDefaultConnection(req, res);
  } catch (err) {
    console.error("❌ Save Default Connection Error:", err);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// DELETE /api/connections/clear
router.delete('/clear', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const result = await Connection.deleteMany({ userId });
    res.status(200).json({
      message: `Cleared ${result.deletedCount} connections for user ${userId}`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Error clearing connections:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/connections/saved-connections?userId=...&accountType=...
router.get('/saved-connections', async (req, res) => {
  const { userId, accountType } = req.query;

  if (!userId || !accountType) {
    return res.status(400).json({ error: 'userId and accountType are required' });
  }

  try {
    const connections = await Connection.find(
      { userId, accountType },
      'repo folder'
    ).lean();

    const validConnections = connections.filter(conn => conn.repo);
    res.status(200).json(validConnections);
  } catch (err) {
    console.error('Error fetching saved connections:', err);
    res.status(500).json({ error: 'Failed to fetch saved connections' });
  }
});

  // ✅ NEW: GET /api/connections/saved-folders?userId=...&repo=...
  router.get('/saved-folders', async (req, res) => {
    const { userId, repo } = req.query;

    if (!userId || !repo) {
      return res.status(400).json({ error: 'userId and repo are required' });
    }

    try {
      // Find all folder-level connections for this user and repo
      const connections = await Connection.find({
        userId,
        repo,
        folder: { $ne: null, $ne: '' }
      }).select('folder');

      // Extract folder name from GitHub URL (e.g., from ".../tree/main/checkov")
      const folderNames = connections
        .map(conn => {
          try {
            // Handle full GitHub URL like: https://github.com/CloudMasa-Tech/tools/tree/main/checkov  
            const url = new URL(conn.folder);
            const pathParts = url.pathname.split('/').filter(Boolean);
            const treeIndex = pathParts.indexOf('tree');
            if (treeIndex !== -1 && pathParts[treeIndex + 2]) {
              return pathParts[treeIndex + 2]; // folder name after 'tree/main'
            }
            // Fallback: use last path segment
            return pathParts[pathParts.length - 1];
          } catch (e) {
            // If not a valid URL, treat as raw path (e.g., just "checkov")
            return String(conn.folder).split('/').pop();
          }
        })
        .filter(name => name && typeof name === 'string' && name !== 'null'); // 👈 ADD THIS LINE

      // Remove duplicates
      const uniqueFolders = [...new Set(folderNames)];

      res.status(200).json(uniqueFolders);
    } catch (error) {
      console.error('Error fetching saved folders:', error);
      res.status(500).json({ error: 'Failed to fetch saved folders' });
    }
  });
export default router;
