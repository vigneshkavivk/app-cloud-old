// server/routes/githubRoutes.js
import express from 'express';
import * as githubController from '../controllers/githubController.js';

const router = express.Router();

// Connect with GitHub using token
router.post("/connect", githubController.connectWithToken);

// Get repos (user/org)
router.get("/repos", githubController.getGithubRepos);

// Get folders from a repo
router.get('/folders/:owner/:repo', githubController.getRepoFolders);
router.get('/file/:owner/:repo/:path(*)', githubController.getFileContent);

export default router;