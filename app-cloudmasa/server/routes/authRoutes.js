// server/routes/authRoutes.js
import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';
import serverConfig from '../config/serverConfig.js';
import authenticate from '../middleware/auth.js';
import * as awsController from '../controllers/awsController.js';

const router = express.Router();

// AWS routes
router.post('/validate-aws-credentials', authenticate, awsController.validateAWSCredentials);
router.post('/connect-to-aws', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(`${serverConfig.frontendUrl}/sidebar`);
  }
);

// GitHub OAuth routes
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(`${serverConfig.frontendUrl}/sidebar`);
  }
);

// Regular auth routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
router.get('/profile', authController.getUserProfile);

export default router;