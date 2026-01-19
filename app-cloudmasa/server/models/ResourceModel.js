// server/models/ResourceModel.js
import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  cloudConnectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CloudConnection',
    required: true,
    index: true
  },
  awsAccountId: {
    type: String,
    required: true,
    index: true
  },
  region: {
    type: String,
    default: 'us-east-1'
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  resourceType: {
    type: String,
    enum: [
      'S3Bucket', 'EC2Instance', 'DynamoDBTable', 'VPC', 'Subnet',
      'SecurityGroup', 'SNS', 'IAMRole', 'IAMUser', 'TerraformDeployment'
    ],
    required: true
  },
  source: {
    type: String,
    enum: ['manual', 'terraform'],
    default: 'manual',
    required: true
  },
  deploymentId: {
    type: String,
    default: null
  },
  tags: {
    type: Map,
    of: String,
    default: {}
  },
  discoveredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'destroyed', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

ResourceSchema.index({ cloudConnectionId: 1, awsAccountId: 1 });
ResourceSchema.index({ resourceId: 1, source: 1 });

export default mongoose.model('Resource', ResourceSchema);
