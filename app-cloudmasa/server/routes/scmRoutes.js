// server/routes/scmRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import * as githubController from '../controllers/githubController.js';
import { getLatestGithubUsername } from '../controllers/connectionController.js'; // ✅ Fixed: ESM import


const router = express.Router();

/**
 * POST /api/scm/fetch-repos
 * Fetch user's GitHub repositories using a token provided in the request body.
 * Token is NOT stored — used only for this request.
 */
router.post('/fetch-repos', authenticate, (req, res) => {
  const { githubToken } = req.body;

  if (!githubToken || typeof githubToken !== 'string' || githubToken.trim() === '') {
    return res.status(400).json({ error: 'Valid GitHub token is required' });
  }

  // ✅ Just forward the token in req.body (no mutation needed)
  req.body.token = githubToken.trim();
  return githubController.connectWithToken(req, res);
});

/**
 * POST /api/scm/fetch-folders
 * Fetch folders from a specific GitHub repo using a token from the request body.
 */
router.post('/fetch-folders', authenticate, (req, res) => {
  const { githubToken, owner, repo } = req.body;

  if (!githubToken || !owner || !repo) {
    return res.status(400).json({
      error: 'Missing required fields: githubToken, owner, and repo'
    });
  }

  if (typeof githubToken !== 'string' || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'All fields must be strings' });
  }

  // ✅ DO NOT mutate req.query or req.params
  // Just call the controller — it should read from req.body
  return githubController.getRepoFolders(req, res);
});

// ✅ ADD ONLY THIS — new route for latest GitHub username
router.get('/connections/latest-github-username', authenticate, getLatestGithubUsername);

export default router;
