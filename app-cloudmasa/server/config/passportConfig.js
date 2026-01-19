// server/config/passportConfig.js
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import logger from '../utils/logger.js';
import { envConfig } from './env.config.js';
import User from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';   // ✅ Import InviteUser
import Workspace from '../models/Workspace.js';    // ✅ Import Workspace

export function configurePassport(passport) {
  // ✅ Serialization: Store only user ID in session
  passport.serializeUser((user, done) => {
    console.log("🔐 Serialize user ID:", user._id);
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    console.log("🔓 Deserialize user ID:", id);
    try {
      const user = await User.findById(id);
      console.log("👤 Deserialized user:", user ? user.email : 'Not found');
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // ✅ Google OAuth Strategy
  passport.use(
    new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_AUTH_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(null, false, { message: 'Google account does not have a verified email.' });
        }

        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email }]
        });

        const validInvite = await InviteUser.findOne({
          email: new RegExp(`^${email}$`, 'i'),
          status: { $in: ['pending', 'accepted'] }
        });

        if (!validInvite) {
          return done(null, false, { message: 'Access denied: No valid invitation found for this email.' });
        }

        if (!user) {
          // 👤 Create new user
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email,
            provider: 'google',
            role: validInvite.role,
            isActive: true,
            lastActive: new Date()
          });
          await user.save();

          // ➕ Add to workspace
          const workspace = await Workspace.findById(validInvite.workspace);
          if (workspace) {
            workspace.members = workspace.members || [];
            workspace.members.push({
              userId: user._id,
              role: validInvite.role,
              joinedAt: new Date()
            });
            await workspace.save();
          }

          // ✅ Accept invite if pending
          if (validInvite.status === 'pending') {
            validInvite.status = 'accepted';
            validInvite.acceptedAt = new Date();
            await validInvite.save();
          }
        } else {
          // 🔄 Update existing user
          let needsSave = false;
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = 'google';
            needsSave = true;
          }
          if (user.role !== validInvite.role) {
            user.role = validInvite.role;
            needsSave = true;
          }
          if (!user.isActive) {
            user.isActive = true;
            user.lastActive = new Date();
            needsSave = true;
          }
          if (needsSave) {
            await user.save();
          }

          // ✅ Accept invite if still pending
          if (validInvite.status === 'pending') {
            validInvite.status = 'accepted';
            validInvite.acceptedAt = new Date();
            await validInvite.save();
          }
        }

        return done(null, user);
      } catch (err) {
        console.error('Google auth error:', err);
        return done(err, false, { message: 'Authentication failed. Please try again.' });
      }
    })
  );
}
