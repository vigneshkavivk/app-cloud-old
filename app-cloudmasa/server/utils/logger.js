// server/utils/logger.js

import { __API_URL__ } from '../config/env.config.js'; // 👈 ES Modules import

// Simple logger utility
const logger = {
  info: (...args) => {
    console.log(`[INFO] [${new Date().toISOString()}]`, ...args);
  },
  
  error: (...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}]`, ...args);
  },
  
  warn: (...args) => {
    console.warn(`[WARN] [${new Date().toISOString()}]`, ...args);
  },
  
  debug: (...args) => {
    if (envConfig.app.env === 'development') {
      console.debug(`[DEBUG] [${new Date().toISOString()}]`, ...args);
    }
  }
};

export default logger; // 👈 ES Modules default export