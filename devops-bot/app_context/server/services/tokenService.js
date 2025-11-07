const Token = require('../models/TokenModel');
const githubService = require('./githubService');
const logger = require('../utils/logger');

// Save token
const saveToken = async (tokenData) => {
  try {
    const { token, platform } = tokenData;
    let accountName = '';

    if (platform === 'github') {
      const githubUser = await githubService.getUserProfile(token);
      accountName = githubUser.login;
    }

    const newToken = new Token({
      token,
      platform,
      accountName,
    });

    return await newToken.save();
  } catch (error) {
    logger.error('Error saving token:', error);
    throw new Error(`Token save failed: ${error.message}`);
  }
};

// Find all tokens
const findAllTokens = async () => {
  try {
    return await Token.find();
  } catch (error) {
    logger.error('Error finding tokens:', error);
    throw new Error('Database error when finding tokens');
  }
};

// Find token by platform
const findTokenByPlatform = async (platform) => {
  try {
    return await Token.findOne({ platform });
  } catch (error) {
    logger.error(`Error finding token by platform (${platform}):`, error);
    throw new Error('Database error when finding token by platform');
  }
};

module.exports = {
  saveToken,
  findAllTokens,
  findTokenByPlatform
};