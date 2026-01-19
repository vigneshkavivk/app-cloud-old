    // server/models/GcpConnection.js
    import mongoose from 'mongoose';

    const gcpConnectionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    projectId: { type: String, required: true },
    projectName: { type: String, required: true },
    region: { type: String, default: 'global' },
    status: { type: String, default: 'active' },
    // 🔐 Dev-only: store raw private key (encrypt in production)
    privateKey: { type: String, required: true },
    }, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    });

    // Ensure uniqueness per user + project
    gcpConnectionSchema.index({ userId: 1, projectId: 1 }, { unique: true });

    export default mongoose.model('GcpConnection', gcpConnectionSchema);
