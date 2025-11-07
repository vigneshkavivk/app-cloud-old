const mongoose = require('mongoose');

const deploymentSchema = new mongoose.Schema({
  selectedTool: { type: String, required: true },
  selectedCluster: { type: String, required: true },
  selectedAccount: { type: Object, required: true },
  selectedToken: { type: Object, required: true },
  gitHubUsername: { type: String, required: true },
  repoUrl: { type: String, required: true },
  selectedFolder: { type: String, required: true },
  namespace: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'delete' // This matches your MongoDB collection
});

const Deployment = mongoose.model('Deployment', deploymentSchema);
module.exports = Deployment;
