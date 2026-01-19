// server/services/authService.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Register from '../models/RegisterModel.js';
import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

// Hash password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw new Error('Password comparison failed');
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    return await Register.findOne({ email });
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw new Error('Database error when finding user');
  }
};

// Create new user
const createUser = async (userData) => {
  try {
    const hashedPassword = await hashPassword(userData.password);
    const user = new Register({
      ...userData,
      password: hashedPassword
    });
    return await user.save();
  } catch (error) {
    logger.error('Error creating user:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

export {
  hashPassword,
  comparePassword,
  findUserByEmail,
  createUser
};