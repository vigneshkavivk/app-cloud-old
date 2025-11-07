const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
  awsAccessKey: { type: String, required: true },
  awsSecretKey: { type: String, required: true },
  clusterName: { type: String, required: true },
  awsRegion: { type: String, required: true },
  outputFormat: { type: String, required: true },
  awsAccountNumber: { type: String, required: true },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'sandy' });

// Update the updatedAt field on save
clusterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Cluster = mongoose.model('Cluster', clusterSchema);

module.exports = Cluster;