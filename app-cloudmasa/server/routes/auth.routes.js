// server/routes/auth.route.js
import express from 'express';
import axios from 'axios';
import passport from 'passport';
import authenticate from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as awsController from '../controllers/awsController.js';
import Token from '../models/Token.js';
import serverConfig from '../config/serverConfig.js';

const router = express.Router();

// ====== FIXED TOKEN ROUTES (USER-SCOPED) ======
router.post('/token', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user._id;

    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform are required' });
    }

    let accountName = '';
    if (platform === 'github') {
      try {
        const githubUser = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `token ${token}` },
        });
        accountName = githubUser.data.login;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid GitHub token' });
      }
    }

    const savedToken = await Token.findOneAndUpdate(
      { userId, platform },
      { token, platform, accountName, userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Token saved successfully', accountName });
  } catch (error) {
    console.error('Error saving token:', error);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

router.get('/token', authenticate, async (req, res) => {
  try {
    const { platform } = req.query;
    const userId = req.user._id;

    if (!platform) {
      return res.status(400).json({ error: 'Platform parameter is required' });
    }

    const tokenDoc = await Token.findOne({ userId, platform });

    if (!tokenDoc) {
      return res.status(404).json({ error: 'No token found for this platform' });
    }

    res.json({ token: tokenDoc.token });
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});
// ====== END TOKEN ROUTES ======

// AWS routes
router.post('/validate-aws-credentials', authenticate, awsController.validateAWSCredentials);
router.post('/connect-to-aws', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect(`${serverConfig.frontendUrl}/sidebar`);
});

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
  res.redirect(`${serverConfig.frontendUrl}/sidebar`);
});

// Auth routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
router.get('/profile', authController.getUserProfile);

export default router;