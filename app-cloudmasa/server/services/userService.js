// server/services/userService.js
import Register from '../models/RegisterModel.js';
import authService from './authService.js';
import logger from '../utils/logger.js';

// Find user by ID
const findUserById = async (id) => {
  try {
    return await Register.findById(id);
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw new Error('Database error when finding user by ID');
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    return await Register.findOne({ email });
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw new Error('Database error when finding user by email');
  }
};

// Create new user
const createUser = async (userData) => {
  try {
    const { name, email, password } = userData;
    
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    const hashedPassword = await authService.hashPassword(password);
    const newUser = new Register({
      name,
      email,
      password: hashedPassword
    });
    
    return await newUser.save();
  } catch (error) {
    logger.error('Error creating user:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

export {
  findUserById,
  findUserByEmail,
  createUser
};