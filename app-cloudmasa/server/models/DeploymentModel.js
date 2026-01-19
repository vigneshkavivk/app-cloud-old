// server/models/DeploymentModel.js
import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema({
  selectedTool: { type: String, required: true },
  selectedCluster: { type: String, required: true },
   selectedAccount: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'CloudConnection', required: true },
    accountId: { type: String, required: true },
    name: { type: String, required: true },       // 👈 enforce `name` presence
    awsRegion: { type: String, required: false }  // optional extra
  },
  selectedToken: { type: Object, required: true }, // Keep required if you always need it
  gitHubUsername: { type: String, required: false }, // ✅ Optional
  repoUrl: { type: String, required: true },
  selectedFolder: { type: String, required: false }, // ✅ Optional (for Argo CD)
  namespace: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'applied', 'failed', 'deployed'],
    default: 'pending'
  },
  errorMessage: String,
  argoAppName: String,
}, {
  timestamps: true
});

const Deployment = mongoose.model('Deployment', deploymentSchema);

export default Deployment;
