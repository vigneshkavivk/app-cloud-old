// models/DeploymentRecord.js
import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true },        // e.g., "aws_instance.web"
  name: { type: String, required: true },      // e.g., "web"
  type: { type: String, required: true },      // e.g., "aws_instance"
  provider: { type: String, default: 'registry.terraform.io/hashicorp/aws' },
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} }, // ✅ Must store full JSON
  status: { 
    type: String, 
    enum: ['active', 'destroyed'], 
    default: 'active' 
  }
}, { _id: false }); // Prevent extra _id in subdocs

const deploymentRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  provider: { type: String, required: true },
  region: { type: String, required: true },
  modules: [String],
  moduleConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  deploymentId: { type: String, required: true, unique: true, index: true },
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CloudConnection', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'destroyed'], // ✅ added 'destroyed'
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  // ✅ Resources as array of sub-docs (NOT strings)
  resources: [resourceSchema]
}, {
  timestamps: true
});

// Index for fast query
deploymentRecordSchema.index({ userId: 1, status: 1, 'resources.status': 1 });

const DeploymentRecord = mongoose.models.DeploymentRecord || 
                         mongoose.model('DeploymentRecord', deploymentRecordSchema);

export default DeploymentRecord;
