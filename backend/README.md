# MasterClass Backend - Emotion-Based Course Recommendation Engine

Backend Node.js cu sistem de recomandare de cursuri bazat pe emoții, ML/DL și preferințe de utilizator.

## Caracteristici

✅ **Autentificare JWT** - Register și login cu emoții și niveluri de energie
✅ **Recomandări bazate pe emoții** - Integrare cu Python ML engine
✅ **Recomandări bazate pe taguri** - Matching de preferințe și categorii
✅ **Recomandări pe baza popularității** - Trending courses
✅ **Emotion Tracking** - Urmărire emoții și interacțiuni
✅ **MongoDB Atlas Integration** - Bază de date cloud
✅ **CORS Configuration** - Suport pentru frontend React

## Stack Tehnologic

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcryptjs
- **ML Integration**: Python API (localhost:5001)
- **HTTP Client**: Axios

## Structura Directoarelor

```
backend/
├── src/
│   ├── models/          # MongoDB schemas
│   │   ├── User.js      # User schema cu emoții și preferințe
│   │   ├── Course.js    # Course schema cu emotion affinity
│   │   └── Recommendation.js  # Recommendation tracking
│   ├── controllers/     # Business logic
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   └── recommendationController.js
│   ├── routes/          # API endpoints
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   └── recommendationRoutes.js
│   ├── services/        # Service layer
│   │   ├── mlRecommendationService.js  # Python ML integration
│   │   └── tagBasedRecommendationService.js
│   ├── middleware/      # Express middleware
│   │   └── auth.js
│   └── server.js        # Entry point
├── package.json
├── .env                 # Environment variables
└── seed.js              # Database seeding script
```

## Setup și Instalare

### 1. Instalează dependențele

```bash
cd backend
npm install
```

### 2. Configurează environment variables

```bash
# .env file
BACKEND_PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/masterclass
FRONTEND_URL=http://localhost:3000
ML_API_URL=http://localhost:5001/api
```

### 3. Seed baza de date

```bash
# Asigură-te că MongoDB este conectat
node seed.js
```

### 4. Start serverul

```bash
# Development
npm run dev

# Production
npm start
```

Server va rula pe `http://localhost:5000`

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Body: {
  "username": "tudor",
  "email": "tudor@example.com",
  "password": "securepass123"
}
```

#### Login
```
POST /api/auth/login
Body: {
  "email": "tudor@example.com",
  "password": "securepass123",
  "emotion": "MOTIVAT",
  "energyLevel": "RIDICATA"
}

Response: {
  "success": true,
  "user": { ... },
  "token": "jwt_token_here"
}
```

#### Get Current User
```
GET /api/auth/me
Header: Authorization: Bearer {token}
```

#### Update Emotion
```
PUT /api/auth/emotion
Header: Authorization: Bearer {token}
Body: {
  "emotion": "FERICIT",
  "energyLevel": "MEDIE"
}
```

#### Update Preferred Tags
```
PUT /api/auth/tags
Header: Authorization: Bearer {token}
Body: {
  "tags": ["Web Development", "Python", "Machine Learning"]
}
```

### Courses

#### Get All Courses
```
GET /api/courses
Query params: category, tags, search

Example: /api/courses?category=Web Development&tags=React,JavaScript
```

#### Get Course by ID
```
GET /api/courses/:id
```

#### Get Categories & Tags
```
GET /api/courses/categories
```

#### Create Course (Admin)
```
POST /api/courses
Header: Authorization: Bearer {token}
Body: {
  "title": "Course Title",
  "description": "...",
  "instructor": "...",
  "duration": 240,
  "level": "Beginner",
  "category": "Web Development",
  "tags": ["HTML", "CSS"],
  "thumbnail": "url",
  "videoUrl": "url"
}
```

### Recommendations

#### Get Recommendations (AI + Tag-based)
```
GET /api/recommendations
Header: Authorization: Bearer {token}

Response: {
  "success": true,
  "recommendations": [
    {
      "_id": "...",
      "title": "...",
      "score": 85.5,
      "source": "ml",
      "matchFactors": { ... },
      "explanation": "..."
    }
  ],
  "mlHealthy": true,
  "userEmotion": "MOTIVAT"
}
```

#### Get Emotion-Based Recommendations
```
POST /api/recommendations/emotion
Header: Authorization: Bearer {token}
Body: {
  "emotion": "RELAXAT",
  "energyLevel": "SCAZUTA"
}
```

#### Record Interaction
```
POST /api/recommendations/interaction
Header: Authorization: Bearer {token}
Body: {
  "courseId": "course_id",
  "actionType": "view" | "enroll" | "complete" | "rate"
}
```

#### Rate Course
```
POST /api/recommendations/rate
Header: Authorization: Bearer {token}
Body: {
  "courseId": "course_id",
  "rating": 4.5,
  "emotion": "FERICIT"
}
```

### Health Check
```
GET /api/health
```

## Emoții Suportate

1. **FERICIT** - Bucurie, optimism → Cururi de creativitate, design
2. **MOTIVAT** - Determinare, energie → Cururi de business, ML, productivitate
3. **RELAXAT** - Calm, liniștit → Yoga, wellness, creative writing
4. **CURIOS** - Descoperire, exploarre → ML, data science, advanced topics
5. **PRODUCTIV** - Focusat, eficient → Programming, data analysis
6. **CREATIV** - Inspirație → Design, writing, creative courses

## Nivele de Energie

1. **RIDICATA** - Energie maximă → Cururi intensive, challenging
2. **MEDIE** - Normal → Toate tipurile de cururi
3. **SCAZUTA** - Obosit → Cururi relaxante, session scurte

## Algoritm de Recomandare

### Score Formula

```
Final Score = (ML_Score * 0.4) + (Tag_Match * 0.25) + (Popularity * 0.15) + (Rating * 0.2)
```

### Componente

1. **ML Score (40%)** - Din Python ML engine bazat pe emoție
2. **Tag Match (25%)** - Similaritate Jaccard cu preferințe utilizator
3. **Popularity (15%)** - Bazat pe enrollment count
4. **Rating (20%)** - Bazat pe course rating

### Fallback Logic

1. Întâi încearcă Python ML API
2. Dacă ML API e down → Emotion-based fallback
3. Dacă nu sunt suficiente → Tag-based recommendations
4. Completează cu popularity-based

## Integrare cu ML Engine

Backend-ul apelează Python ML API pe `http://localhost:5001/api`:

```
POST /api/recommendations
Body: {
  "currentMood": "MOTIVAT",
  "energyLevel": "RIDICATA",
  "enrolledCourses": [],
  "completedCourses": [],
  "learningHistory": [],
  "preferredTags": ["Machine Learning"],
  "recentEmotions": [],
  "userId": "..."
}
```

## Bază de Date

### User Schema
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  currentEmotion: String,
  currentEnergyLevel: String,
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

### Course Schema
```javascript
{
  title: String,
  description: String,
  instructor: String,
  duration: Number,
  level: String,
  category: String,
  tags: [String],
  thumbnail: String,
  videoUrl: String,
  rating: Number,
  reviewCount: Number,
  enrollmentCount: Number,
  completionCount: Number,
  emotionAffinity: {
    FERICIT: Number,
    MOTIVAT: Number,
    RELAXAT: Number,
    CURIOS: Number,
    PRODUCTIV: Number,
    CREATIV: Number
  },
  createdAt: Date
}
```

### Recommendation Schema
```javascript
{
  user: ObjectId,
  course: ObjectId,
  emotion: String,
  energyLevel: String,
  score: Number,
  source: String, // 'emotion', 'tag', 'ml', 'popularity'
  matchFactors: {
    emotionMatch: Number,
    tagMatch: Number,
    historyMatch: Number,
    popularityScore: Number,
    mlScore: Number
  },
  explanation: String,
  clicked: Boolean,
  enrolled: Boolean,
  completed: Boolean,
  rating: Number,
  createdAt: Date
}
```

## Testing API

### cURL Examples

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"tudor","email":"tudor@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tudor@test.com","password":"pass123","emotion":"MOTIVAT"}'

# Get Recommendations
curl -X GET http://localhost:5000/api/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Courses
curl -X GET "http://localhost:5000/api/courses?category=Web Development"
```

## Troubleshooting

### "Cannot connect to MongoDB"
- Verifică `MONGODB_URI` în `.env`
- Asigură-te că MongoDB Atlas IP whitelist include mașina ta

### "ML API unavailable"
- Asigură-te că Python ML engine rulează pe localhost:5001
- Verifică `ML_API_URL` în `.env`

### "JWT verification failed"
- Asigură-te că token-ul este valid și nu a expirat
- Verifică `JWT_SECRET` în backend și front-end

## Performance Tips

1. Setează MongoDB indexe pe utilizator
2. Cacheaza recomandările pentru 5-10 minute
3. Limitează query-uri cu pagination
4. Activează GZIP compression în Express

## Próximi Pași

- [ ] Implementare caching cu Redis
- [ ] Rate limiting
- [ ] Admin dashboard
- [ ] Analytics și insights
- [ ] Sistem de notificări
- [ ] Integrare social media

## Licență

MIT
