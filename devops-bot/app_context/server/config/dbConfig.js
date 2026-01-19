const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { envConfig } = require('./env.config');

const connectToDatabase = async () => {
  const mongoURI = envConfig.mongo.url;
  console.log(mongoURI,"uri")
  if (!mongoURI) {
    logger.error('Mongo URI is not defined in the environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = {
  connectToDatabase
};