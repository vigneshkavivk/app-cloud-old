// server/routes/userAuthRoutes.js
import express from 'express';
import * as userController from '../controllers/userController.js';
import authenticate from '../middleware/auth.js';
import Register from '../models/RegisterModel.js';

const router = express.Router();

// ✅ Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await Register.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ✅ Update current user's profile
router.patch('/me', authenticate, async (req, res) => {
  try {
    const updatedUser = await Register.findByIdAndUpdate(
      req.user._id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Login user
router.post('/login', userController.loginUser);

// Register new user
router.post('/register', userController.registerUser);

// Get user profile (protected route)
router.get('/profile', userController.getUserProfile);

// Validate invite token
router.get('/validate/:token', userController.validateInviteToken);

export default router;