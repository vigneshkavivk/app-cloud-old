// server/models/ClusterModel.js
import mongoose from 'mongoose';

const clusterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  account: { type: String, required: true, trim: true },
 status: { 
  type: String, 
  default: 'running', 
  enum: ['running', 'stopped', 'pending', 'unknown', 'not-found'], // ✅ Added "not-found"
},
  awsAccessKey: { type: String, required: false, select: false },
  awsSecretKey: { type: String, required: false, select: false },
  outputFormat: { type: String, default: 'json' },
  kubeContext: {
    type: String,
    required: true,
    trim: true,
    // Example: "arn:aws:eks:us-east-1:890742610918:cluster/Prod-cluster"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'clusters',
  timestamps: false
});

clusterSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

// Define indexes
clusterSchema.index({ name: 1, account: 1 });
clusterSchema.index({ account: 1 });

// Safely export model without deletion (prevents caching issues)
const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', clusterSchema);

export default Cluster;
