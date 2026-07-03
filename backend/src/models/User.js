import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: function () { return this.role !== 'admin'; }, // Admin doesn't need email
    unique: true,
    sparse: true, // Allows null for admin
    match: /.+\@.+\..+/
  },
  password: {
    type: String,
    required: true
  },
  
  // NEW: Company association
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  // NEW: Package tier association (for individual free users, company users use company's package)
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  
  // NEW: Password security & expiration
  passwordChangedAt: Date,
  passwordResetRequired: {
    type: Boolean,
    default: false // Set to true for first login after user creation via CSV
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // NEW: OAuth Integration
  oauth: {
    googleId: String,
    linkedinId: String,
    provider: {
      type: String,
      enum: ['local', 'google', 'linkedin']
    }
  },
  
  // NEW: Multi-Factor Authentication
  mfa: {
    enabled: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['email', 'sms', 'authenticator', 'google', 'linkedin'],
      default: 'email'
    },
    phoneNumber: String,
    // For TOTP (Time-based One-Time Password)
    twoFactorSecret: String,
    twoFactorBackupCodes: [String],
    twoFactorVerified: {
      type: Boolean,
      default: false
    },
    lastVerifiedAt: Date
  },
  
  // NEW: Location data for analytics
  lastLoginLocation: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number,
    lastLoginAt: Date
  },
  
  // NEW: GDPR Consent
  gdprConsent: {
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    version: String // To track consent version
  },
  
  // NEW: Analytics tracking consent
  analyticsConsent: {
    type: Boolean,
    default: false
  },
  cookiesConsent: {
    type: Boolean,
    default: false
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  fullName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  currentEmotion: {
    type: String,
    enum: ['HAPPY', 'MOTIVATED', 'RELAXED', 'CURIOUS', 'PRODUCTIVE', 'CREATIVE', 'NEUTRAL', 'happy', 'motivated', 'relaxed', 'curious', 'productive', 'creative', 'neutral'],
    default: 'NEUTRAL'
  },
  currentEnergyLevel: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW', 'high', 'medium', 'low'],
    default: 'MEDIUM'
  },
  interests: [String],
  activityDomain: String,
  // Questionnaire data from profile setup
  initialQuestionnaire: {
    interests: [String],
    activityDomain: String,
    goals: [String],
    experience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  },
  // Background information
  background: {
    domain: String,
    occupation: String,
    education: String
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  completedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  watchedReels: [{
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel'
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    completedWatch: Boolean
  }],
  recentlyViewedReels: [{
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  courseRatings: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    rating: Number,
    emotion: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  preferredTags: [String],
  learningHistory: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    completedAt: Date,
    emotion: String,
    engagementScore: Number
  }],
  activityLog: [{
    action: {
      type: String,
      enum: ['login', 'logout', 'view_course', 'start_course', 'complete_course',
        'watch_reel', 'rate_course', 'enroll', 'search', 'mood_change']
    },
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0 // in minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Log activity method
UserSchema.methods.logActivity = async function (action, details = {}) {
  this.activityLog.push({
    action,
    details,
    timestamp: new Date()
  });
  // Keep only last 1000 activities
  if (this.activityLog.length > 1000) {
    this.activityLog = this.activityLog.slice(-1000);
  }
  await this.save();
};

// Static method to create admin user if not exists
UserSchema.statics.ensureAdminExists = async function () {
  const adminUsername = process.env.ADMIN_USERNAME || 'admintudy';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admintudy';

  const existingAdmin = await this.findOne({ username: adminUsername, role: 'admin' });

  if (!existingAdmin) {
    const admin = new this({
      username: adminUsername,
      password: adminPassword,
      role: 'admin',
      email: 'admin@masterclass.local'
    });
    await admin.save();
    console.log('✓ Admin user created: ' + adminUsername);
    return admin;
  }

  console.log('✓ Admin user exists: ' + adminUsername);
  return existingAdmin;
};

export default mongoose.model('User', UserSchema);
