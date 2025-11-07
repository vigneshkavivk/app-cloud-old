// server/models/RegisterModel.js
import mongoose from 'mongoose';

// 🔹 Optional: Keep ALLOWED_ROLES if you want enum validation
// But since you validate roles dynamically via Role collection, enum is redundant
// You can keep it for extra safety, or remove it — both work
const ALLOWED_ROLES = ['super-admin', 'admin', 'user', 'developer', 'devops', 'guest', 'viewer'];

const registerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  githubToken: { type: String }, 
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ALLOWED_ROLES,
    default: 'user'
  },
  // ✅ ADD THESE TWO FIELDS FOR ACTIVITY TRACKING
  lastActive: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now },
});

const Register = mongoose.model('Register', registerSchema);
export default Register;
