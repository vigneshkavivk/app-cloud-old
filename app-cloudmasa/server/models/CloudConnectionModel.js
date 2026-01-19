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
  // ✅ ADD THIS — critical for AssumeRole
  roleArn: {
    type: String,
    required: true, // or optional? but your logic requires it
    validate: {
      validator: (v) => /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(v),
      message: 'Invalid Role ARN format',
    },
  },
}, { timestamps: true });

const CloudConnection = mongoose.model('CloudConnection', CloudConnectionSchema);

export default CloudConnection;

