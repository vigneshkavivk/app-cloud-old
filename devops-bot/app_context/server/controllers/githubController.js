const axios = require('axios');
const Token = require('../models/TokenModel');
const logger = require('../utils/logger');

const GITHUB_API_URL = 'https://api.github.com';

// Get GitHub repositories
const getGithubRepos = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'GitHub token is required' });
  }

  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const toolsRepo = response.data.find(repo => repo.name === 'tools');

    if (!toolsRepo) {
      return res.status(404).json({ error: 'tools repository not found' });
    }

    res.json({ repositories: [toolsRepo.full_name] });
  } catch (error) {
    logger.error('Error fetching GitHub repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
  }
};

module.exports = {
  getGithubRepos,
};