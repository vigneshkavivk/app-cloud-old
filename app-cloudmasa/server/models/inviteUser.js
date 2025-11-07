// server/models/InviteUser.js
import mongoose from 'mongoose';

const inviteUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  // ✅ Store role as STRING (name), not ObjectId
  role: { 
    type: String, 
    required: true 
  },
  workspace: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true 
  },
  invitedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' } // optional but useful
});

const InviteUser = mongoose.model('InviteUser', inviteUserSchema);
export default InviteUser;