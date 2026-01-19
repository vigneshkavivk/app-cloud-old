// server/routes/authRoutes.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import authenticate from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as awsController from '../controllers/awsController.js';
import serverConfig from '../config/serverConfig.js';

import Register from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';

const router = express.Router();

/* =====================================================
  AWS ROUTES
===================================================== */
router.post('/validate-aws-credentials', authenticate, awsController.validateAWSCredentials);
router.post('/connect-to-aws', authenticate, awsController.connectToAWS);
router.get('/get-aws-accounts', authenticate, awsController.getAWSAccounts);

/* =====================================================
  GOOGLE OAUTH
===================================================== */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, googleUser) => {
    if (err || !googleUser) {
      console.error('Google auth failed:', err);
      return res.redirect(
        `${serverConfig.frontendUrl}/login?error=google_auth_failed`
      );
    }

    try {
      const email = googleUser.email.toLowerCase();

      /* ===============================
        STEP 1: CHECK INVITE (STRICT)
      =============================== */
      const invite = await InviteUser.findOne({
        email,
        status: 'accepted'
      });

      if (!invite) {
        console.warn('Blocked Google login (invite not accepted):', email);
        return res.redirect(
          `${serverConfig.frontendUrl}/login?error=invite_not_accepted`
        );
      }

      /* ===============================
        STEP 2: FIND OR CREATE USER
      =============================== */
      let user = await Register.findOne({ email });

      if (!user) {
        user = await Register.create({
          name: googleUser.name,
          email,
          googleId: googleUser.googleId,
          role: invite.role,
          provider: 'google'
        });

        // ➕ Add user to workspace
        const workspace = await Workspace.findById(invite.workspace);
        if (workspace) {
          workspace.members.push({
            userId: user._id,
            role: invite.role,
            joinedAt: new Date()
          });
          await workspace.save();
        }
      }

      /* ===============================
        STEP 3: GENERATE JWT
      =============================== */
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          role: invite.role, // 🔐 ROLE FROM INVITE
          provider: 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      /* ===============================
        STEP 4: REDIRECT TO FRONTEND
      =============================== */
      return res.redirect(
        `${serverConfig.frontendUrl}/auth/callback?token=${token}`
      );
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(
        `${serverConfig.frontendUrl}/login?error=server_error`
      );
    }
  })(req, res, next);
});

/* =====================================================
   GITHUB OAUTH (UNCHANGED)
===================================================== */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?error=github_auth_failed'
  }),
  (req, res) => {
    try {
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          provider: 'github'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.redirect(
        `${serverConfig.frontendUrl}/auth/callback?token=${token}`
      );
    } catch (err) {
      console.error('GitHub callback error:', err);
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

/* =====================================================
  NORMAL AUTH
===================================================== */
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
router.get('/profile', authenticate, authController.getUserProfile);

export default router;

