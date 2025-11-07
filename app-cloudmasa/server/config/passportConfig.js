// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const GitHubStrategy = require('passport-github2').Strategy;
// const logger = require('../utils/logger');
// const { envConfig } = require('./env.config');

// exports.configurePassport = (passport) => {
//   // Google Strategy
//   passport.use(
//     new GoogleStrategy(
//       {
//         clientID: envConfig.google.clientID,
//         clientSecret: envConfig.google.clientSecret,
//         callbackURL: envConfig.google.authCallbackURL,
//         scope: ['profile', 'email'],
//       },
//       (accessToken, refreshToken, profile, done) => {
//         return done(null, profile);
//       }
//     )
//   );

//   // GitHub Strategy
//   passport.use(
//     new GitHubStrategy(
//       {
//         clientID: envConfig.gitHub.clientId,
//         clientSecret: envConfig.gitHub.clientSecret,
//         callbackURL: envConfig.gitHub.authCallbackURL,
//         scope: ['user:email'],
//       },
//       (accessToken, refreshToken, profile, done) => {
//         return done(null, profile);
//       }
//     )
//   );

//   // Serialization/Deserialization
//   passport.serializeUser((user, done) => done(null, user));
//   passport.deserializeUser((user, done) => done(null, user));
// };

// Local Strategy
//  passport.use(
//    new LocalStrategy(
//      { usernameField: 'email' },
//      async (email, password, done) => {
//        try {
//          // Your logic to find user by email and verify password
//          const user = await findUserByEmail(email); // implement this
//          if (!user) {
//            return done(null, false, { message: 'User not found' });
//          }
//
//          const isValid = await verifyPassword(password, user.password); // implement this
//          if (!isValid) {
//            return done(null, false, { message: 'Incorrect password' });
//          }
//
//          return done(null, user);
//        } catch (err) {
//          return done(err);
//        }
//      }
//    )
//  );

  // Serialization/Deserialization
//  passport.serializeUser((user, done) => done(null, user));
//  passport.deserializeUser((user, done) => done(null, user));
//};


// server/config/passportConfig.js
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import logger from '../utils/logger.js';
import { envConfig } from './env.config.js';

export function configurePassport(passport) {
  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: envConfig.google.clientID,
        clientSecret: envConfig.google.clientSecret,
        callbackURL: envConfig.google.authCallbackURL,
        scope: ['profile', 'email'],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );

  // GitHub Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: envConfig.gitHub.clientId,
        clientSecret: envConfig.gitHub.clientSecret,
        callbackURL: envConfig.gitHub.authCallbackURL,
        scope: ['user:email'],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );

  // Serialization/Deserialization
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}