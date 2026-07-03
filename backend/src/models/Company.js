import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  phone: String,
  website: String,
  
  // Company details
  industry: String,
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  address: {
    street: String,
    city: String,
    state: String,
    postal: String,
    country: String
  },
  
  // Subscription package for company
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  
  // Package subscription details
  subscription: {
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'trial', 'expired', 'cancelled'],
      default: 'trial'
    },
    trialEndDate: Date,
    autoRenew: {
      type: Boolean,
      default: true
    },
    licenseCount: {
      type: Number,
      default: 1
    }
  },
  
  // Company admin (primary contact)
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // All users in company
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Logo/branding
  logo: {
    fileId: String,
    filename: String,
    url: String
  },
  
  // GDPR/Privacy settings
  gdprSettings: {
    dataRetentionDays: Number,
    allowAnalytics: {
      type: Boolean,
      default: true
    },
    allowCookies: {
      type: Boolean,
      default: true
    }
  },
  
  // Billing
  billing: {
    invoiceEmail: String,
    paymentMethod: String, // 'credit_card', 'bank_transfer'
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    nextBillingDate: Date
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Company', CompanySchema);
