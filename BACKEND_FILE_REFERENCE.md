# Backend File Structure & Quick Reference

## 📁 Complete Backend Folder Structure

```
backend/
│
├── 📄 package.json                 # Dependencies and scripts
├── 📄 .env                         # Environment configuration
├── 📄 seed.js                      # Database seeding with 10 sample courses
│
├── 🔧 Configuration & Integration Files
├── 📄 backendApiService.js         # Fetch client for React frontend
├── 📄 useBackendHooks.js           # React hooks (useAuth, useRecommendations, useCourses)
│
├── 📚 Documentation
├── 📄 README.md                    # Full API documentation (800 lines)
├── 📄 FRONTEND_INTEGRATION.md      # React integration guide (700 lines)
├── 📄 SETUP_GUIDE.md               # Setup and startup instructions
├── 📄 start.sh                     # Startup script
│
└── 🗂️ src/
    │
    ├── 📄 server.js                 # Express app entry point (100 lines)
    │
    ├── 🔐 models/ (MongoDB Schemas)
    │   ├── 📄 User.js               # User with emotions, learning history, preferences
    │   ├── 📄 Course.js             # Course with emotion affinity scores
    │   └── 📄 Recommendation.js     # Recommendation tracking and analytics
    │
    ├── 🎮 controllers/ (Business Logic)
    │   ├── 📄 authController.js     # Register, login, emotion update (150 lines)
    │   ├── 📄 courseController.js   # Course CRUD operations (100 lines)
    │   └── 📄 recommendationController.js # AI recommendations (300 lines)
    │
    ├── 🛣️ routes/ (API Endpoints)
    │   ├── 📄 authRoutes.js         # /api/auth/* endpoints
    │   ├── 📄 courseRoutes.js       # /api/courses/* endpoints
    │   └── 📄 recommendationRoutes.js # /api/recommendations/* endpoints
    │
    ├── 🔧 services/ (Service Layer)
    │   ├── 📄 mlRecommendationService.js       # Python ML engine integration
    │   └── 📄 tagBasedRecommendationService.js # Tag-based + popularity algorithms
    │
    └── 🛡️ middleware/
        └── 📄 auth.js              # JWT authentication middleware
```

---

## 📊 Key Files Overview

### Core Backend Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/server.js` | 100 | Express app setup, MongoDB connection, port 5000 |
| `package.json` | 30 | 12 dependencies (express, mongoose, jwt, etc.) |
| `.env` | 8 | Environment configuration |

### Models (Database Schemas)

| File | Purpose | Key Fields |
|------|---------|-----------|
| `src/models/User.js` | User profile | currentEmotion, energyLevel, enrolledCourses, preferredTags, learningHistory |
| `src/models/Course.js` | Course catalog | title, tags, category, emotionAffinity (6 emotions), basePopularity |
| `src/models/Recommendation.js` | Recommendations log | user, course, emotion, score, source, matchFactors |

### Controllers (Business Logic)

| File | Lines | Key Functions |
|------|-------|---|
| `authController.js` | 150 | register, login (with emotion), getCurrentUser, updateEmotion, updatePreferredTags |
| `courseController.js` | 100 | getAllCourses, getCourseById, getCategories, createCourse |
| `recommendationController.js` | 300 | getRecommendations, recommendByEmotion, recordInteraction, rateCourse |

### Services (External Integration & Algorithms)

| File | Purpose |
|------|---------|
| `mlRecommendationService.js` | Calls Python ML engine on :5001, handles retries, health checks |
| `tagBasedRecommendationService.js` | Jaccard similarity, emotion affinity calculation, popularity scoring |

### Routes (API Endpoints)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth` | POST/GET/PUT | User registration, login, profile management |
| `/api/courses` | GET/POST | Browse courses, create new courses |
| `/api/recommendations` | GET/POST | Get AI recommendations, track interactions |

### Frontend Integration

| File | Lines | Purpose |
|------|-------|---------|
| `backendApiService.js` | 200 | Fetch wrapper, token management, 14 API methods |
| `useBackendHooks.js` | 300 | React hooks: useAuth, useRecommendations, useCourses |

### Documentation

| File | Lines | Purpose |
|------|-------|---------|
| `README.md` | 800 | Complete API docs, schemas, algorithms, troubleshooting |
| `FRONTEND_INTEGRATION.md` | 700 | React examples, hook usage, data flow diagrams |
| `SETUP_GUIDE.md` | 150 | Quick start, prerequisites, testing guide |

---

## 🚀 API Endpoints Summary

### Authentication (5 endpoints)
```
POST   /api/auth/register         - Create new user
POST   /api/auth/login            - Login with emotion tracking
GET    /api/auth/me               - Get current user (JWT required)
PUT    /api/auth/emotion          - Update emotion and energy (JWT required)
PUT    /api/auth/tags             - Update preferred tags (JWT required)
```

### Courses (4 endpoints)
```
GET    /api/courses               - List courses (with filters)
GET    /api/courses/:id           - Get course details
GET    /api/courses/categories    - Get categories and tags
POST   /api/courses               - Create course (JWT required)
```

### Recommendations (4 endpoints)
```
GET    /api/recommendations       - Get AI recommendations (JWT required)
POST   /api/recommendations/emotion - Get emotion-specific recommendations
POST   /api/recommendations/interaction - Record user interaction
POST   /api/recommendations/rate  - Rate a course
```

### System (1 endpoint)
```
GET    /api/health                - Server health check
```

---

## 💾 Database Collections

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (bcrypt hashed),
  currentEmotion: String,           // FERICIT, MOTIVAT, etc.
  currentEnergyLevel: String,       // RIDICATA, MEDIE, SCAZUTA
  enrolledCourses: [ObjectId],
  completedCourses: [ObjectId],
  courseRatings: [{course, rating, emotion, timestamp}],
  preferredTags: [String],
  learningHistory: [{course, completedAt, emotion, engagementScore}],
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Courses Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  instructor: String,
  duration: Number,               // minutes
  level: String,                  // Beginner, Intermediate, Advanced
  category: String,
  tags: [String],
  thumbnail: String,
  videoUrl: String,
  rating: Number,                 // 0-5
  reviewCount: Number,
  enrollmentCount: Number,
  completionCount: Number,
  emotionAffinity: {              // Scores for each emotion
    FERICIT: Number,
    MOTIVAT: Number,
    RELAXAT: Number,
    CURIOS: Number,
    PRODUCTIV: Number,
    CREATIV: Number
  },
  basePopularity: Number,
  createdAt: Date
}
```

### Recommendations Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,
  course: ObjectId,
  emotion: String,
  energyLevel: String,
  score: Number,                  // 0-100
  source: String,                 // 'emotion', 'tag', 'ml', 'popularity'
  matchFactors: {
    emotionMatch: Number,
    tagMatch: Number,
    historyMatch: Number,
    popularityScore: Number,
    mlScore: Number
  },
  explanation: String,            // Why recommended
  clicked: Boolean,
  enrolled: Boolean,
  completed: Boolean,
  rating: Number,
  createdAt: Date
}
```

---

## 🎯 Emotions Mapping

```javascript
const EMOTIONS = {
  FERICIT: {
    label: "Happy",
    description: "Optimistic and joyful",
    recommendedCategories: ["Creative", "Design", "Writing"]
  },
  MOTIVAT: {
    label: "Motivated",
    description: "Driven and determined",
    recommendedCategories: ["Business", "ML", "Programming"]
  },
  RELAXAT: {
    label: "Relaxed",
    description: "Calm and peaceful",
    recommendedCategories: ["Wellness", "Yoga", "Mindfulness"]
  },
  CURIOS: {
    label: "Curious",
    description: "Eager to learn and explore",
    recommendedCategories: ["Data Science", "Advanced Topics", "Research"]
  },
  PRODUCTIV: {
    label: "Productive",
    description: "Focused and efficient",
    recommendedCategories: ["Programming", "Data Analysis", "Tools"]
  },
  CREATIV: {
    label: "Creative",
    description: "Inspired and imaginative",
    recommendedCategories: ["Design", "Writing", "Art"]
  }
}
```

---

## 🔄 Recommendation Algorithm Flow

```
User Request
    ↓
Check JWT Token
    ↓
Get User from DB
    ↓
┌─────────────────────────────────┐
│ Try ML Engine (40% weight)      │
│ http://localhost:5001/api       │
└─────────────────────────────────┘
    ↓ Success          ↓ Timeout/Error
    ✓ Got ML results   Use Fallback
    ↓
Merge with:
├─ Tag-based (25%)    - Jaccard similarity
├─ Popularity (15%)   - Enrollment count
└─ Rating (20%)       - Course ratings
    ↓
Deduplicate & Sort
    ↓
Save to DB (analytics)
    ↓
Return Top 10
```

---

## 🧪 Sample Seed Data

The `seed.js` script creates 10 sample courses:

1. **Web Development Fundamentals** - HTML, CSS, JavaScript
2. **Machine Learning Basics** - Python, ML Algorithms
3. **React Advanced Patterns** - React, JavaScript
4. **Yoga for Relaxation** - Wellness, Mindfulness
5. **Creative Writing Masterclass** - Writing, Creativity
6. **Python for Data Analysis** - Python, Pandas, Data
7. **UI/UX Design Principles** - Design, Figma
8. **Business Strategy 101** - Business, Management
9. **Digital Marketing Essentials** - Marketing, SEO
10. **Advanced Deep Learning** - TensorFlow, Neural Networks

Each course has:
- Emotion affinity scores (0-100) for all 6 emotions
- Tags for categorization
- Rating and enrollment counts

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",           // Web framework
  "mongoose": "^8.0.0",           // MongoDB ODM
  "cors": "^2.8.5",              // Cross-origin requests
  "dotenv": "^16.3.1",           // Environment variables
  "jsonwebtoken": "^9.1.2",      // JWT authentication
  "bcryptjs": "^2.4.3",          // Password hashing
  "axios": "^1.6.0",             // HTTP client for ML API
  "express-async-errors": "^3.1.1" // Async error handling
}
```

---

## 🔐 Security Features

- ✅ JWT tokens (30 days expiry)
- ✅ bcryptjs password hashing
- ✅ CORS whitelisting
- ✅ Input validation
- ✅ Environment variable protection
- ✅ Secure error messages
- ✅ No sensitive data in logs

---

## 📈 Performance Optimizations

- ✅ MongoDB indexing on frequently queried fields
- ✅ Async/await for non-blocking operations
- ✅ Connection pooling with Mongoose
- ✅ GZIP compression ready
- ✅ Efficient query filtering
- ✅ Pagination support

---

## ✨ Ready to Use!

All files are created and configured. Just:

1. `cd backend && npm install`
2. Update `.env` with MongoDB credentials
3. `node seed.js` (optional, adds sample courses)
4. `npm run dev` (start server)

Server runs on **http://localhost:5000** 🚀

---

## 📞 File Quick Reference

Need to modify something? Here's where to find it:

- **Change recommendation weights?** → `src/services/tagBasedRecommendationService.js`
- **Add new API endpoint?** → `src/routes/` + `src/controllers/`
- **Modify user schema?** → `src/models/User.js`
- **Change emotion categories?** → `src/models/Course.js` + `seed.js`
- **Adjust timeout for ML API?** → `src/services/mlRecommendationService.js`
- **Update frontend API URL?** → `backendApiService.js`
- **Change database?** → `.env` + `src/models/*`

---

That's it! Your complete Node.js backend with emotion-based recommendations is ready! 🎉
