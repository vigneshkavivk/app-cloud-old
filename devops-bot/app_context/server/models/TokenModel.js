const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  platform: { type: String, enum: ['github', 'gitlab', 'bitbucket'], required: true },
  accountName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Token = mongoose.model('Token', tokenSchema, 'scmmanager');

module.exports = Token;