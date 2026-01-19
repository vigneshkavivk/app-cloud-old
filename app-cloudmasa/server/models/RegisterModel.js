    import mongoose from 'mongoose';

    const registerSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        githubToken: { type: String },
        // ✅ Make password optional for OAuth users
        password: { 
            type: String, 
            required: function() { 
            return this.provider !== 'google' && this.provider !== 'github'; 
            }
        },
        googleId: { type: String },
        provider: { type: String, default: 'email' },
        role: { type: String, default: 'user' },
        lastActive: { type: Date, default: null },
        isActive: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        });

    const Register = mongoose.model('Register', registerSchema);
    export default Register;
