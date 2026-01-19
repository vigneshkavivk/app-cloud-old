// server/validator/env.validator.js
import Joi from 'joi';

const envValidator = Joi.object({
  // General configuration
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default("0.0.0.0"),
  ENV: Joi.string().valid('development', 'production').default("development"),
  FRONTEND_URL: Joi.string().uri().required(),
  // MongoDB configuration
  MONGO_URI: Joi.string().uri().required(),

  GITHUB_CLIENT_ID: Joi.string().required(),
  GITHUB_CLIENT_SECRET: Joi.string().required(),
  GITHUB_AUTH_CALLBACK_URL: Joi.string().uri().required(),
  
  REACT_APP_GITTOKEN: Joi.string().required(),
  
  ACCESS_KEY: Joi.string().required(),
  SECRET_KEY: Joi.string().required(),
  
  EMAIL_USER: Joi.string().required(),
  EMAIL_PASS: Joi.string().required(),
  MAIL_SERVICE: Joi.string().required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_AUTH_CALLBACK_URL: Joi.string().uri().required(),
}).unknown(true);

export { envValidator }; // 👈 ES Modules named export