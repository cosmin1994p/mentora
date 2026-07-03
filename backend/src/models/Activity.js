import mongoose from 'mongoose';

/**
 * Global Activity Log Schema
 * Stores all user activities for analytics and recommendation improvement
 */
const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'login', 'logout', 'register',
      // Course interactions
      'view_course', 'start_course', 'complete_course',
      'enroll_course', 'unenroll_course', 'rate_course',
      // Video interactions
      'watch_video', 'pause_video', 'seek_video', 'complete_video',
      // Reel interactions
      'view_reel', 'like_reel', 'share_reel', 'complete_reel',
      // Search and discovery
      'search', 'filter', 'browse_category',
      // Recommendations
      'view_recommendation', 'click_recommendation', 'dismiss_recommendation',
      // User preferences
      'mood_change', 'update_preferences', 'update_profile',
      // Admin actions
      'admin_upload_video', 'admin_create_course', 'admin_create_reel',
      'admin_update_course', 'admin_delete_course', 'admin_delete_reel'
    ],
    index: true
  },

  // Related entities
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  reel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  },

  // User's emotional state at time of action
  emotion: {
    type: String,
    enum: [
      // Romanian
      'FERICIT', 'MOTIVAT', 'RELAXAT', 'CURIOS', 'PRODUCTIV', 'CREATIV', 'NEUTRU',
      'fericit', 'motivat', 'relaxat', 'curios', 'productiv', 'creativ', 'neutru',
      // English
      'HAPPY', 'MOTIVATED', 'RELAXED', 'CURIOUS', 'PRODUCTIVE', 'CREATIVE', 'NEUTRAL',
      'happy', 'motivated', 'relaxed', 'curious', 'productive', 'creative', 'neutral'
    ]
  },
  energyLevel: {
    type: String,
    enum: [
      // Romanian
      'RIDICATA', 'MEDIE', 'SCAZUTA',
      'ridicata', 'medie', 'scazuta',
      // English
      'HIGH', 'MEDIUM', 'LOW',
      'high', 'medium', 'low'
    ]
  },

  // Action details (flexible schema)
  details: {
    // For video/reel watching
    watchDuration: Number, // seconds watched
    watchPercentage: Number, // 0-100
    startTime: Number,
    endTime: Number,

    // For search
    searchQuery: String,
    resultsCount: Number,

    // For ratings
    rating: Number,
    previousRating: Number,

    // For recommendations
    recommendationScore: Number,
    recommendationSource: String,

    // General
    page: String,
    deviceType: String,
    sessionId: String
  },

  // Client information
  ipAddress: String,
  userAgent: String,

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  // Expire after 1 year for data management
  // Remove this if you want to keep all data forever
  // expireAfterSeconds: 31536000
});

// Compound indexes for common queries
ActivitySchema.index({ user: 1, action: 1, timestamp: -1 });
ActivitySchema.index({ course: 1, action: 1, timestamp: -1 });
ActivitySchema.index({ action: 1, timestamp: -1 });

// Static method to log activity
ActivitySchema.statics.logActivity = async function (userId, action, data = {}) {
  try {
    const activity = new this({
      user: userId,
      action,
      course: data.courseId,
      reel: data.reelId,
      emotion: data.emotion,
      energyLevel: data.energyLevel,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get user activity summary
ActivitySchema.statics.getUserSummary = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return summary;
};

// Static method to get course engagement
ActivitySchema.statics.getCourseEngagement = async function (courseId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const engagement = await this.aggregate([
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);

  return engagement;
};

export default mongoose.model('Activity', ActivitySchema);
