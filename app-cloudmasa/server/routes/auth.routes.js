// server/routes/auth.routes.js
import express from 'express';
import axios from 'axios';
import passport from 'passport';
import authenticate from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as awsController from '../controllers/awsController.js';
import Token from '../models/Token.js';

// ✅ ADD THESE IMPORTS — missing in current file
import Register from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import serverConfig from '../config/serverConfig.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ====== FIXED TOKEN ROUTES (USER-SCOPED) ======
// ... (keep existing token, aws routes unchanged) ...
router.post('/token', authenticate, async (req, res) => { /* unchanged */ });
router.get('/token', authenticate, async (req, res) => { /* unchanged */ });
router.post('/validate-aws-credentials', authenticate, awsController.validateAWSCredentials);
router.post('/connect-to-aws', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);

// 🔐 Google OAuth — ✅ FULLY FIXED
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { 
          id: req.user._id, 
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          provider: req.user.provider
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.redirect(`${serverConfig.frontendUrl}/sidebar?token=${token}`);
    } catch (err) {
      console.error('Token generation error:', err);
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

// 🔐 GitHub OAuth (keep as-is for now)
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${serverConfig.frontendUrl}/login`);
  }
);

// ✅ Auth routes — unchanged
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
router.get('/profile', authController.getUserProfile);

export default router;
