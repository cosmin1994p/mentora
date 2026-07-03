import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  
  // UPDATED: Instructors are now references to Instructor model
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  }],
  
  duration: mongoose.Schema.Types.Mixed, // Can be number (minutes) or string ("1h 30m")
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  category: {
    type: String,
    index: true
  },
  // Multiple categories for ML recommendations
  categories: [{
    type: String,
    index: true
  }],
  tags: [{
    type: String,
    index: true
  }],
  // Thumbnail stored in B2 (fileId is now a string path, not ObjectId)
  thumbnail: {
    fileId: String,  // B2: e.g. "thumbnails/courseId-timestamp.jpg"
    filename: String,
    contentType: String,
    url: String
  },
  // Main video stored in B2 (fileId is now a string path, not ObjectId)
  video: {
    fileId: String,  // B2: e.g. "videos/courseId-timestamp-video.mp4"
    filename: String,
    contentType: String,
    duration: Number, // in seconds
    size: Number, // in bytes
    url: String
  },
  // Instructor image stored in B2 (fileId is now a string path, not ObjectId)
  instructorImage: {
    fileId: String,  // B2: e.g. "instructor-images/courseId-timestamp.jpg"
    filename: String,
    contentType: String,
    url: String
  },
  // Legacy fields for backward compatibility
  videoUrl: String,
  // HLS adaptive streaming
  hlsUrl: String,       // e.g. /api/hls/<courseId>/master.m3u8
  hlsReady: {
    type: Boolean,
    default: false
  },
  // Number of lessons (count)
  lessons: {
    type: Number,
    default: 10
  },
  // Individual lesson data with timestamps
  lessonsData: [{
    title: String,
    startTime: Number, // in seconds
    description: String,
    videoUrl: String
  }],
  // Quiz questions for the course
  quizQuestions: [{
    question: String,
    options: [String],
    correctAnswer: Number
  }],
  
  // NEW: Individual lessons/videos that compose this course
  // Similar to LinkedIn Learning or MasterClass structure
  lessonsArray: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  
  // NEW: Package tier access (which package tiers can access this course)
  packageTiers: [{
    type: String,
    enum: ['Free', 'Starter', 'Growth', 'Enterprise', 'Elite', 'Pro']
  }],
  
  // NEW: Is this course free or premium?
  isFree: {
    type: Boolean,
    default: false
  },
  
  // NEW: Course expiration date (when course becomes inaccessible)
  expirationDate: Date,
  
  // NEW: Preview duration if course is locked (in seconds)
  previewDuration: {
    type: Number,
    default: 300 // 5 minutes default
  },
  
  // Additional info content for the Info tab
  infoContent: String,
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  students: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  completionCount: {
    type: Number,
    default: 0
  },
  // Reels generated from this course
  reels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  }],
  content: {
    sections: [{
      title: String,
      lessons: [{
        title: String,
        duration: Number,
        videoUrl: String,
        video: {
          fileId: mongoose.Schema.Types.ObjectId,
          filename: String
        }
      }]
    }]
  },
  // Machine Learning scoring data
  emotionAffinity: {
    FERICIT: { type: Number, default: 0.5 },
    MOTIVAT: { type: Number, default: 0.5 },
    RELAXAT: { type: Number, default: 0.5 },
    CURIOS: { type: Number, default: 0.5 },
    PRODUCTIV: { type: Number, default: 0.5 },
    CREATIV: { type: Number, default: 0.5 }
  },
  energyLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  basePopularity: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for search
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Course', CourseSchema);

