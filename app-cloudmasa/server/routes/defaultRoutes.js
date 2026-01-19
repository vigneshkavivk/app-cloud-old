// routes/defaultRoutes.js
import express from 'express';
import Default from '../models/DefaultModel.js';

import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(authMiddleware);

// ✅ Save default repo/folder for logged-in user
router.post('/save-default', async (req, res) => {
  const { repo, folder, name, lastSync, status } = req.body;

  // Log request for debugging
  console.log('📥 Save-default request body:', req.body);
  console.log('📥 Authenticated user:', req.user);

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: user not found' });
  }

  if (!repo || !folder) {
    return res.status(400).json({ message: 'Repository and folder are required' });
  }

  try {
    const newEntry = new Default({
      userId: req.user.id, // link entry to logged-in user
      name: name || folder.split('/').pop(), // default name if not provided
      repo,
      folder,
      status: status || 'Connected',
      lastSync: lastSync ? new Date(lastSync) : new Date(),
    });

    const saved = await newEntry.save();
    console.log('✅ Saved to DB:', saved);
    res.status(200).json(saved);
  } catch (err) {
    console.error('❌ Save default error:', err);
    res.status(500).json({ message: 'Error saving data', error: err.message });
  }
});

// ⚠️ Catch-all for unknown API routes
router.all('*', (req, res) => {
  res.status(404).json({ message: 'API route not found', path: req.originalUrl });
});

export default router;
