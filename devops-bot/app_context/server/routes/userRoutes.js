const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * User authentication and profile routes
 */

// Login user
// POST /api/auth/login  (depending on how router is mounted in app.js)
router.post('/login', userController.loginUser);

// Register new user
// POST /api/auth/register
router.post('/register', userController.registerUser);

// Get user profile (protected route)
router.get('/profile', userController.getUserProfile);

// Validate invite token
// GET /api/auth/validate/:token
router.get('/validate/:token', userController.validateInviteToken);

module.exports = router;
