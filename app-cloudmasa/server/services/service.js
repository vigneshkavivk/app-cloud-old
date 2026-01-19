// server/config/passport.js
import passport from 'passport';
import { envConfig } from '../config/env.config.js';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Passport setup for Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: envConfig.google.clientID,
      clientSecret: envConfig.google.clientSecret,
      callbackURL: envConfig.google.authCallbackURL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user to retrieve from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;