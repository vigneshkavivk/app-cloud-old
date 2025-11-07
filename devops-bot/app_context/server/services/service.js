

const passport = require('passport');
const { envConfig } = require('../config/env.config');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Passport setup for Google OAuth
passport.use(
    new GoogleStrategy(
        {
            clientID: envConfig.google.clientID, // Client ID from Google Developer Console
            clientSecret: envConfig.google.clientSecret, // Client Secret from Google Developer Console
            callbackURL: envConfig.google.authCallbackURL, // Callback URL after successful Google login
        },
        (accessToken, refreshToken, profile, done) => {
            // In this callback, you can save user data to the database or perform any logic before authentication
            return done(null, profile); // Pass profile to done function which serializes it for the session
        }
    )
);

// Serialize user to store in session (used in session)
passport.serializeUser((user, done) => {
    done(null, user); // Store user object in session
});

// Deserialize user to retrieve from session (used to fetch user data when required)
passport.deserializeUser((user, done) => {
    done(null, user); // Retrieve user object from session
});

module.exports = passport;
