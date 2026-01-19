// server/models/azureCredentialModel.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encrypt.js';

// Define the schema
const azureCredentialSchema = new mongoose.Schema({
  cloudProvider: {
    type: String,
    required: true,
    enum: ['Azure'],
    default: 'Azure',
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  clientId: {
    type: String,
    required: true,
    trim: true,
  },
  clientSecret: {
    type: {
      iv: String,
      content: String,
      authTag: String,
    },
    required: true,
  },
  tenantId: {
    type: String,
    required: true,
    trim: true,
  },
  subscriptionId: {
    type: String,
    required: true,
    trim: true,
  },
  region: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Modern async pre-save middleware (recommended for Mongoose 6+)
azureCredentialSchema.pre('save', async function () {
  // Only encrypt if clientSecret is modified AND is still a plain string
  // (on first save it will be string; on updates it will already be encrypted object)
  if (this.isModified('clientSecret') && typeof this.clientSecret === 'string') {
    this.clientSecret = encrypt(this.clientSecret);
  }
});

// Virtual getter: Decrypt clientSecret on demand (when needed)
azureCredentialSchema.virtual('decryptedClientSecret').get(function () {
  if (this.clientSecret && this.clientSecret.content) {
    try {
      return decrypt(this.clientSecret);
    } catch (err) {
      console.error('Decryption failed for Azure credential:', err.message);
      return null;
    }
  }
  return null;
});

// Ensure virtuals are included when converting to JSON/object
azureCredentialSchema.set('toObject', { virtuals: true });
azureCredentialSchema.set('toJSON', { virtuals: true });

// Optional: Hide sensitive fields when returning documents
azureCredentialSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.clientSecret; // Never expose encrypted secret in JSON
  return obj;
};

export default mongoose.model('AzureCredential', azureCredentialSchema);

