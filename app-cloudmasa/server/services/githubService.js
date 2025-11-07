// server/services/githubService.js
import axios from 'axios';
import logger from '../utils/logger.js';

const GITHUB_API_URL = 'https://api.github.com';

// Get user profile with token
const getUserProfile = async (token) => {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching GitHub user profile:', error);
    throw new Error(`GitHub API Error: ${error.message}`);
  }
};

// Get user repositories
const getUserRepositories = async (token) => {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching GitHub repositories:', error);
    throw new Error(`GitHub API Error: ${error.message}`);
  }
};

// Find repository by name
const findRepositoryByName = async (token, repoName) => {
  try {
    const repos = await getUserRepositories(token);
    return repos.find(repo => repo.name === repoName);
  } catch (error) {
    logger.error(`Error finding repository by name (${repoName}):`, error);
    throw new Error(`GitHub API Error: ${error.message}`);
  }
};

export {
  getUserProfile,
  getUserRepositories,
  findRepositoryByName
};