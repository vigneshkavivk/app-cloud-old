// server/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  awsCredentials: {
    accessKeyId: { type: String },
    secretAccessKey: { type: String },
    region: { type: String, default: "us-east-1" }
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User; // 👈 Enables `import User from './User.js'`