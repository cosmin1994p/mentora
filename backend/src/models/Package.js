import mongoose from 'mongoose';

const PackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Starter', 'Growth', 'Enterprise', 'Elite'],
    unique: true
  },
  priceMonthly: {
    type: Number,
    required: true // in EUR
  },
  priceAnnual: {
    type: Number // in EUR
  },
  description: String,
  
  // Access controls
  features: [{
    name: String,
    description: String,
    included: Boolean
  }],
  
  // Courses included in this package (by tier)
  includedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Limits
  limits: {
    maxUsers: Number,
    maxTeams: Number,
    storageGB: Number,
    videoQuality: {
      type: String,
      enum: ['720p', '1080p', '4K'],
      default: '720p'
    }
  },
  
  // Seat/User pricing
  pricePerSeat: {
    type: Number,
    default: 0 // For enterprise packages
  },
  
  // Trial period
  trialDaysAvailable: {
    type: Number,
    default: 0
  },
  
  order: {
    type: Number,
    unique: true // For sorting (Free=1, Starter=2, etc.)
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

export default mongoose.model('Package', PackageSchema);
