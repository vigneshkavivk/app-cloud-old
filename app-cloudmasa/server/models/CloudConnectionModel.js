// server/models/CloudConnectionModel.js
import mongoose from 'mongoose';

const CloudConnectionSchema = new mongoose.Schema({
  awsAccessKey: { type: String, required: true },
  awsSecretKey: { type: String, required: true },
  awsRegion: { type: String, default: 'us-east-1' },
  accountId: { type: String, required: true },
  iamUserName: { type: String, required: true },
  accountName: { type: String, required: true }, // ✅ Now included
  userId: { type: String, required: true },
  arn: { type: String, required: true },
}, { timestamps: true });

const CloudConnection = mongoose.model('CloudConnection', CloudConnectionSchema);

export default CloudConnection;