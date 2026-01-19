	import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Allow null for guest/anon tickets (e.g., pre-login support)
    required: false,
    default: null
  },
  username: {
    type: String,
    required: true,
    trim: true,
    default: 'Guest'
  },
  type: {
    type: String,
    enum: ['Bug Report', 'Feature Request', 'Access Issue', 'Billing', 'Other'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  attachments: [{
    filename: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Index for performance
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
