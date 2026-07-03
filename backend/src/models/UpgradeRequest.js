import mongoose from 'mongoose';

const UpgradeRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  desiredPackage: {
    type: String,
    enum: ['Free', 'Starter', 'Growth', 'Enterprise', 'Elite'],
    required: true
  },
  message: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'completed', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('UpgradeRequest', UpgradeRequestSchema);
