// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose'; // ✅ Import ObjectId validator
import Register from '../models/RegisterModel.js';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token is empty.' });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate that decoded.id is a valid ObjectId string
    if (!decoded.id || !Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ error: 'Invalid user ID in token.' });
    }

    // Find user by ObjectId
    const user = await Register.findById(new Types.ObjectId(decoded.id));

    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token signature.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    console.error('Auth middleware error:', error);
    return res.status(400).json({ error: 'Invalid token.' });
  }
};

export default authenticate;