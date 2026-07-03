import mongoose from 'mongoose';

const InstructorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true // e.g., "Creative Leadership", "Personal Branding"
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  profileImage: {
    fileId: String,  // B2: e.g. "instructors/name-timestamp.jpg"
    filename: String,
    contentType: String,
    url: String
  },
  email: {
    type: String,
    match: /.+\@.+\..+/
  },
  socialLinks: {
    linkedin: String,
    twitter: String,
    website: String
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
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

export default mongoose.model('Instructor', InstructorSchema);
