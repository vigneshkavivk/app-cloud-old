// /server/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Register from '../models/RegisterModel.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import logger from '../utils/logger.js';

const generateToken = (userId) => {
return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: '24h' }
);
};

const registerUser = async (req, res) => {
const { name, email, password } = req.body;

try {
    if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await Register.findOne({ email });
    if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ Check for pending invitation
    

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Register({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: invitation.role  // ✅ Copy role from invite
    });
    await newUser.save();

    // ✅ Add user to workspace
    const workspace = await Workspace.findById(invitation.workspace);
    if (workspace) {
    if (!workspace.members) workspace.members = [];
    workspace.members.push({
        userId: newUser._id,
        role: invitation.role,
        joinedAt: new Date()
    });
    await workspace.save();
    }

    const token = generateToken(newUser._id);

    res.status(201).json({
    message: 'User registered successfully',
    user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
    },
    token
    });
} catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({ message: 'Failed to register user' });
}
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await Register.findOne({ email });
        if (!user) {
        return res.status(400).json({ message: 'User not found' });
        }

        if (user.googleId && !password) {
          // Google SSO: OK
        } else if (password) {
          // Manual login: check password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }
        } else {
          return res.status(400).json({ message: 'Password required' });
        }

        // ✅ ACTIVATE USER REGARDLESS OF LOGIN METHOD
        user.lastActive = new Date();
        user.isActive = true;
        await user.save();

        const token = generateToken(user._id);

        res.json({
        message: 'Login successful',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastActive: user.lastActive
        },
        token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
    };

const getUserProfile = async (req, res) => {
try {
    const user = await Register.findById(req.user._id).select('-password');
    if (!user) {
    return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
} catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
}
};

const logoutUser = (req, res) => {
// For JWT, real logout needs a denylist. For now, client-side token removal is enough.
res.json({ message: 'Logged out successfully' });
};

export {
registerUser,
loginUser,
getUserProfile,
logoutUser
};
