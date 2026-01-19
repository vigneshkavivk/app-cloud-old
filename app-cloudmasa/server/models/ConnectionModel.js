// models/ConnectionModel.js
import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  repo: {
    type: String,
    required: true,
  },

  repoUrl: { type: String, required: false }, 
  
  folder: {
    type: String,
    required: false, // ✅ Now optional!
    default: null,   // ✅ Default is null
  },
  status: {
    type: String,
    enum: ['Connected', 'Repo Saved', 'Not Added'], // ✅ Added "Repo Saved" as valid status
    default: 'Connected',
  },
  lastSync: {
    type: Date,
    default: Date.now,
    set: (v) => new Date(v),
  },
  userId: {
    type: String,
    required: true, // 👈 Make sure this is required if you need it
  },
  accountType: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  strict: false, // ✅ Allow unknown fields (for debugging)
});

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;