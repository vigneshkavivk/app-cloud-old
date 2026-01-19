const path = require('path');
const { envConfig } = require('./env.config');

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

module.exports = serverConfig;