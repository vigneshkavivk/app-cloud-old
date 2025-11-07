// server/models/DeploymentModel.js
import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema({
  selectedTool: { type: String, required: true },
  selectedCluster: { type: String, required: true },
  selectedAccount: { type: Object, required: true },
  selectedToken: { type: Object, required: true }, // Keep required if you always need it
  gitHubUsername: { type: String, required: false }, // ✅ Optional
  repoUrl: { type: String, required: true },
  selectedFolder: { type: String, required: false }, // ✅ Optional (for Argo CD)
  namespace: { type: String, required: true },
}, {
  timestamps: true
});

const Deployment = mongoose.model('Deployment', deploymentSchema);

export default Deployment;