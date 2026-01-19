const dotenv = require('dotenv');
const { envValidator } = require('../validator/env.validator');

// Load environment variables from .env file
dotenv.config();

// Validate the environment variables against the schema
const { error, value } = envValidator.validate(process.env, {
  allowUnknown: true, // Allow extra variables that are not listed in the schema
  abortEarly: false,  // Show all errors, not just the first one
});

// If validation fails, throw an error and display all validation issues
if (error) {
  console.error('❌ Environment variable validation error:', error.details);
  process.exit(1);
} else {
  console.log('✅ Environment variables loaded and validated successfully');
}

// Structured config object that is exported
exports.envConfig = {
  app: {
    port: value.PORT,
    host: value.HOST,
    frontendURL: value.FRONTEND_URL,
    env: value.ENV,
  },

  mongo: {
    url: value.MONGO_URI,
  },

  gitHub: {
    clientId: value.GITHUB_CLIENT_ID,
    clientSecret: value.GITHUB_CLIENT_SECRET,
    authCallbackURL: value.GITHUB_AUTH_CALLBACK_URL
  },

  reactApp: {
    gitToken: value.REACT_APP_GITTOKEN
  },

  auth: {
    secret: value.AUTH_SECRET,
    access: value.ACCESS_KEY
  },

  mail: {
    user: value.EMAIL_USER,
    pass: value.EMAIL_PASSWORD,
    service: value.MAIL_SERVICE,
  },

  google: {
    clientID: value.GOOGLE_CLIENT_ID,
    clientSecret: value.GOOGLE_CLIENT_SECRET,
    authCallbackURL: value.GOOGLE_AUTH_CALLBACK_URL
  }
};
