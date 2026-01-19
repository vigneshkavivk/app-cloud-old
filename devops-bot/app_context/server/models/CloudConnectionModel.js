const mongoose = require('mongoose');

const cloudConnectionSchema = new mongoose.Schema({
  awsAccessKey: { type: String, required: true },
  awsSecretKey: { type: String, required: true },
  awsRegion: { type: String, required: true },
  accountId: { type: String, required: true },
  userId: { type: String, required: true },
  arn: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'cloudconnection' });

const CloudConnection = mongoose.model('CloudConnection', cloudConnectionSchema);

module.exports = CloudConnection;