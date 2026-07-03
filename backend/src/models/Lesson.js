import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // NEW: Chapter this lesson belongs to
  chapter: {
    name: String,  // e.g. "Capitol 1" or "Chapter 1 - Fundamentals"
    order: Number  // Chapter sequence in course
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  order: {
    type: Number,
    required: true // Determines lesson sequence in course
  },
  duration: Number, // in seconds
  // Video stored in B2
  video: {
    fileId: String,  // B2: e.g. "lessons/courseId-lessonId-timestamp.mp4"
    filename: String,
    contentType: String,
    size: Number, // in bytes
    url: String
  },
  // HLS streaming for this lesson video
  hlsUrl: String,   // e.g. /api/hls/lesson/<lessonId>/master.m3u8
  hlsReady: {
    type: Boolean,
    default: false
  },
  // Lesson thumbnail
  thumbnail: {
    fileId: String,
    filename: String,
    contentType: String,
    url: String
  },
  // Quiz for this specific lesson
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  // Resources/attachments for lesson
  resources: [{
    title: String,
    fileId: String,  // B2: e.g. "resources/courseId-lessonId-file.pdf"
    filename: String,
    url: String,
    contentType: String
  }],
  // Transcription/Subtitle
  transcript: {
    language: String, // 'en', 'ro', etc.
    content: String,
    vttUrl: String // SubRip/VTT file URL
  },
  isPublished: {
    type: Boolean,
    default: false
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

// Index for course lookups
LessonSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Lesson', LessonSchema);
