import mongoose from 'mongoose';

const CompanyRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyDetails: {
    name: {
      type: String,
      required: true
    },
    industry: String,
    expectedSeats: String,
    website: String,
    phone: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminFeedback: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('CompanyRequest', CompanyRequestSchema);
