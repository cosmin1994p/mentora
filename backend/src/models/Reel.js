import mongoose from 'mongoose';

const ReelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  creator: String, // Creator name for display

  // Source course (optional - some reels may be standalone)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  courseId: mongoose.Schema.Types.ObjectId, // Alternative reference

  // Reel video stored in B2 (fileId is now a string path, not ObjectId)
  video: {
    fileId: String,  // B2: e.g. "videos/reelId-timestamp.mp4"
    filename: String,
    contentType: String,
    size: Number, // in bytes
    url: String
  },

  // Legacy video URL (for demo/external videos)
  videoUrl: String,

  // Reel thumbnail stored in B2 (fileId is now a string path, not ObjectId)
  thumbnail: {
    fileId: String,  // B2: e.g. "thumbnails/reelId-timestamp.jpg"
    filename: String,
    contentType: String,
    url: String
  },

  // Duration in seconds (flexible, not enum)
  duration: {
    type: Number,
    default: 30
  },

  // Source video timestamps
  sourceVideo: {
    startTime: Number, // in seconds
    endTime: Number    // in seconds
  },

  // Direct time fields for frontend compatibility
  startTime: Number,
  endTime: Number,

  // Engagement metrics
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },

  // Users who liked this reel (for toggle and persistence)
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Comments on this reel
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Tags for discovery
  tags: [String],

  // Emotion affinity for recommendations
  emotionAffinity: {
    FERICIT: { type: Number, default: 0.5 },
    MOTIVAT: { type: Number, default: 0.5 },
    RELAXAT: { type: Number, default: 0.5 },
    CURIOS: { type: Number, default: 0.5 },
    PRODUCTIV: { type: Number, default: 0.5 },
    CREATIV: { type: Number, default: 0.5 }
  },

  isPublished: {
    type: Boolean,
    default: true
  },

  // Expiration date for time-limited content
  expirationDate: {
    type: Date,
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries
ReelSchema.index({ course: 1, createdAt: -1 });
ReelSchema.index({ tags: 1 });
ReelSchema.index({ isPublished: 1, viewCount: -1 });

export default mongoose.model('Reel', ReelSchema);
