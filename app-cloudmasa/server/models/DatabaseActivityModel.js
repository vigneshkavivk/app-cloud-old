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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // === In-progress deployment state ===
  currentStep: { type: String, default: null },
  logs: [{ type: String }],
  statusMessage: { type: String, default: "" },
  isDeploying: { type: Boolean, default: false },
  finalOutput: { type: String, default: "" },
});

// Auto-update `updatedAt`
databaseActivitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('DatabaseActivity', databaseActivitySchema);
