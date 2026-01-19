// server/routes/githubRoutes.js
import express from 'express';
import authenticate from '../middleware/auth.js';

// ✅ FIXED: Import the controller function properly
import { getGithubConnectionStatus } from '../controllers/githubController.js';
import * as githubController from '../controllers/githubController.js';

const router = express.Router();

// ✅ GitHub connection status (DB-backed)
router.get('/status', authenticate, getGithubConnectionStatus);

// Existing routes (use githubController.* for others)
router.post("/connect", authenticate, githubController.connectWithToken);
router.get("/repos", authenticate, githubController.getGithubRepos);
router.post('/folders', authenticate, githubController.getRepoFolders);
router.get('/file/:owner/:repo/:path(*)', authenticate, githubController.getFileContent);
router.put('/file/:owner/:repo', authenticate, githubController.saveFile);

export default router;
