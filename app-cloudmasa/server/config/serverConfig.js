// server/config/serverConfig.js
import path from 'path';
import { fileURLToPath } from 'url';
import { envConfig } from './env.config.js';

// __dirname alternative for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverConfig = {
  port: envConfig.app.port,
  env: envConfig.app.env,
  sessionSecret: process.env.SESSION_SECRET || 'defaultSecret',
  // Email configuration
  email: {
    service: envConfig.mail.service,
    auth: {
      user: envConfig.mail.user,
      pass: envConfig.mail.pass
    }
  },
  // Auth callback URLs
  authCallbacks: {
    google: envConfig.google.authCallbackURL,
    github: envConfig.gitHub.authCallbackURL
  },
  // Frontend URL
  frontendUrl: envConfig.app.frontendURL,
  // Temporary directory for file operations
  tempDir: path.join(__dirname, '../../tmp')
};

export default serverConfig;