const mongoose = require('mongoose');

const inviteUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
role: { type: String, enum: ['admin', 'user', 'developer','devops','guest','viewer'], required: true },

  invitedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('InviteUser', inviteUserSchema);
