// models/DatabaseActivityModel.js
import mongoose from 'mongoose';

const databaseActivitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'destroy', 'in-progress']
  },
  dbType: { type: String, required: true },
  awsAccountId: { type: String, required: true },
  awsAccountName: { type: String, required: true },
  endpoint: { type: String }, // for created DBs
  // createdAt and updatedAt will be handled automatically by timestamps: true

  // === In-progress deployment state ===
  currentStep: { type: String, default: null },
  logs: [{ type: String }],
  statusMessage: { type: String, default: "" },
  isDeploying: { type: Boolean, default: false },
  finalOutput: { type: String, default: "" },
  deploymentId: { type: String }, // Add this field if you want to store the unique deployment ID
  completedAt: { type: Date }, // Add this field to track completion time
  variables: { type: String }, // Store the JSON string of variables used for the deployment
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// No need for custom middleware - timestamps handles it automatically
// This is the most reliable approach and follows Mongoose best practices

export default mongoose.model('DatabaseActivity', databaseActivitySchema);

