// server/routes/authGoogleRoutes.js
import express from 'express';
import passport from 'passport';
import { loginUser, getUserProfile, logoutUser } from '../controllers/authController.js';

const router = express.Router();

// Root route with a login option for Google
router.get('/', (req, res) => {
    res.send("<a href='/auth/google'>Login With Google</a>");
});

// Google authentication route
router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// Google callback route
router.get('/auth/google/callback', passport.authenticate('google', { 
    failureRedirect: '/' 
}), (req, res) => {
    res.redirect('/profile');
});

// Profile route
router.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
        res.send(`<h1>Welcome ${req.user.displayName || req.user.name}</h1><a href='/auth/logout'>Logout</a>`);
    } else {
        res.redirect('/');
    }
});

// Logout route
router.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

export default router;