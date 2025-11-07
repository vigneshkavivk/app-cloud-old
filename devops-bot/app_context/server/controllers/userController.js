const Register = require('../models/RegisterModel');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// Get current user profile
const getUserProfile = async (req, res) => {
  try {
    // This assumes you have user information in req.user after authentication
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
const loginUser = async (req, res) => {
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

const registerUser = async (req, res) => {
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
const validateInviteToken = async (req, res) => {
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

module.exports = {
  getUserProfile,
  registerUser,
  validateInviteToken,
  loginUser

};