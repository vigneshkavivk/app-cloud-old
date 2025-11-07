// server/models/ClusterModel.js
import mongoose from 'mongoose';

// Clear cache if already defined
if (mongoose.models.Cluster) {
  delete mongoose.models.Cluster;
}

const clusterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  account: { type: String, required: true, trim: true },
  status: { type: String, default: 'running', enum: ['running', 'stopped', 'pending', 'unknown'] },
  awsAccessKey: { type: String, required: false, select: false },
  awsSecretKey: { type: String, required: false, select: false },
  outputFormat: { type: String, default: 'json' },
  // ✅ Add kubeContext field
  kubeContext: {
    type: String,
    required: true,
    trim: true,
    // Example value: "arn:aws:eks:us-east-1:890742610918:cluster/Prod-cluster"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'clusters',
  timestamps: false
});

clusterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

clusterSchema.index({ name: 1, account: 1 });
clusterSchema.index({ account: 1 });

const Cluster = mongoose.model('Cluster', clusterSchema);

export default Cluster;