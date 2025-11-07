// server/config/db.js
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import 'dotenv/config'; // ES Modules style

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URL;

if (!mongoURI) {
  logger.error('❌ MongoDB URI is missing! Set MONGO_URI in .env file.');
  process.exit(1);
}

const connectToDatabase = async () => {
  try {
    await mongoose.connect(mongoURI);
    logger.info('✅ MongoDB connected successfully!');
    logger.info(`🔗 Connected to DB: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export { connectToDatabase }; // 👈 ES Modules export