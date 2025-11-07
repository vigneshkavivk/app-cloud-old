const axios = require('axios');
const Token = require('../models/TokenModel');
const logger = require('../utils/logger');

// Save SCM token
const saveToken = async (req, res) => {
  const { token, platform } = req.body;

  try {
    let accountName = '';

    if (platform === 'github') {
      const githubUser = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      accountName = githubUser.data.login;
    }

    const newToken = new Token({ token, platform, accountName });
    await newToken.save();

    res.status(200).json({ message: 'Token saved successfully', accountName });
  } catch (err) {
    logger.error('Error saving token:', err);
    res.status(500).send('Failed to save token or fetch account name');
  }
};

// Get all tokens
const getTokens = async (req, res) => {
  try {
    const tokens = await Token.find();
    res.status(200).json(tokens);
  } catch (err) {
    logger.error('Error fetching tokens:', err);
    res.status(500).send('Failed to fetch tokens');
  }
};

module.exports = {
  saveToken,
  getTokens
};