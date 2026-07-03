import mongoose from 'mongoose';

const RecommendationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  emotion: String,
  energyLevel: String,
  score: Number,
  source: {
    type: String,
    enum: ['emotion', 'tag', 'collaborative', 'popularity', 'ml'],
    default: 'ml'
  },
  matchFactors: {
    emotionMatch: Number,
    tagMatch: Number,
    historyMatch: Number,
    popularityScore: Number,
    mlScore: Number
  },
  explanation: String,
  clicked: {
    type: Boolean,
    default: false
  },
  enrolled: {
    type: Boolean,
    default: false
  },
  completed: {
    type: Boolean,
    default: false
  },
  rating: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('Recommendation', RecommendationSchema);
