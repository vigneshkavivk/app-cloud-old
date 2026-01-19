const passport = require('passport');
const bcrypt = require('bcrypt');
const Register = require('../models/RegisterModel');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// Register a new user
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await Register.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Register({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

// Login user (handled by Passport local strategy)
const loginUser = async (req, res) => {
  try {
    console.log('Request body:', req.body); // Add this line

    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await Register.findOne({ email });
    console.log('User found:', user); // Add this line

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // 2. Compare entered password with hashed one
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch); // Add this line

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Send response
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
const logoutUser = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
};

// User profile
const getUserProfile = (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: `Welcome ${req.user.name}` });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
};
