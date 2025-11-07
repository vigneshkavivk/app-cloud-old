const express = require('express');
const githubController = require('../controllers/githubController');

const router = express.Router();

// GitHub routes
router.get('/repos', githubController.getGithubRepos);

module.exports = router;