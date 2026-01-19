// server/controllers/userController.js
import Register from '../models/RegisterModel.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import InviteUser from '../models/inviteUser.js';

export const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.status(200).json({ 
      user: req.user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Register.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
      },
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await Register.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Register({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await InviteUser.findOne({ token });

    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite link.',
      });
    }

    res.status(200).json({
      success: true,
      email: invite.email,
      role: invite.role,
    });
  } catch (error) {
    console.error('Error validating invite token:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating invite token.',
    });
  }
};