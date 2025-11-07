const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const serverConfig = require('../config/serverConfig');

const router = express.Router();

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

module.exports = router;