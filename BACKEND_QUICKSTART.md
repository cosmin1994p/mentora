# Backend Setup Summary - Quick Start

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Edit `.env` file with your MongoDB Atlas credentials:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/masterclass
JWT_SECRET=your-super-secret-key-here
BACKEND_PORT=5000
ML_API_URL=http://localhost:5001/api
FRONTEND_URL=http://localhost:3000
```

### 3. Seed Database (Optional but Recommended)
```bash
node seed.js
```
This adds 10 sample courses with emotion affinity data.

### 4. Start Backend Server
```bash
npm run dev
```

Server will run on: **http://localhost:5000**

---

## 📋 What's Included

### API Endpoints (Ready to Use)

**Authentication**
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login with emotion tracking
- `GET /api/auth/me` - Get current user (needs JWT)
- `PUT /api/auth/emotion` - Update current emotion
- `PUT /api/auth/tags` - Update preferred tags

**Recommendations**
- `GET /api/recommendations` - AI-powered recommendations
- `POST /api/recommendations/emotion` - Get recommendations for specific emotion
- `POST /api/recommendations/interaction` - Track user interactions
- `POST /api/recommendations/rate` - Rate a course

**Courses**
- `GET /api/courses` - List all courses (with filters)
- `GET /api/courses/:id` - Get course details
- `GET /api/courses/categories` - Get all categories and tags
- `POST /api/courses` - Create new course (admin)

**System**
- `GET /api/health` - Server health check

### Recommendation Algorithm

The system combines 4 scoring methods:

1. **ML-based (40%)** - Emotion-tag affinity from Python engine
2. **Tag-based (25%)** - Jaccard similarity with user preferences
3. **Popularity (15%)** - Based on enrollment count
4. **Rating (20%)** - Based on course ratings

**Fallback chain:**
- Try ML API first (Python engine)
- If ML down → Use rule-based emotion matching
- If not enough → Add tag-based recommendations
- Complete with popularity-based courses

### Database Models

**Users** - Track emotions, learning history, preferences
**Courses** - Course metadata with emotion affinity scores
**Recommendations** - Recommendation history and metrics

---

## 🔌 Integration with Frontend

### Step 1: Copy Files
```bash
cp backend/backendApiService.js src/utils/
cp backend/useBackendHooks.js src/utils/
```

### Step 2: Update .env
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3: Use in React
```typescript
import { useAuth, useRecommendations } from './utils/useBackendHooks';

export function App() {
  const { user, login, logout } = useAuth();
  const { recommendations, fetchRecommendations } = useRecommendations();

  // Use the hooks in your components...
}
```

### Step 4: Setup Login with Emotion
```typescript
const handleLogin = async (email, password, emotion) => {
  await login(email, password, emotion, 'MEDIE');
  // User is now logged in with emotion preference
};
```

---

## 🧪 Testing

### Test with cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get all courses
curl http://localhost:5000/api/courses

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'

# Login with emotion
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"pass123",
    "emotion":"MOTIVAT",
    "energyLevel":"RIDICATA"
  }'

# Get recommendations (use token from login)
curl http://localhost:5000/api/recommendations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Key Features

✅ **Emotion-Based Recommendations** - AI recommends courses based on current emotion
✅ **ML Integration** - Seamlessly integrates with Python ML engine on :5001
✅ **Tag-Based Matching** - Recommends based on user preferences and interests
✅ **Fallback Systems** - Works even if ML API goes offline
✅ **JWT Authentication** - Secure token-based auth
✅ **MongoDB Atlas** - Cloud database support
✅ **CORS Configured** - Ready for React frontend on :3000
✅ **Interaction Tracking** - Records user actions for ML training
✅ **Course Ratings** - Users can rate and review courses
✅ **Energy Level Support** - Considers user energy (RIDICATA, MEDIE, SCAZUTA)

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Fix:** Check MONGODB_URI in .env and ensure IP whitelist is configured in MongoDB Atlas

### ML API Not Found
```
Error: Cannot reach http://localhost:5001/api
```
**Fix:** Start Python ML engine separately, or ensure it's running. Backend will use fallback if unavailable.

### Port 5000 Already in Use
```bash
# Kill process on port 5000
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000
```

### JWT Token Errors
**Fix:** Ensure JWT_SECRET in .env matches across frontend and backend. Token expires in 30 days.

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── User.js           # User schema with emotions
│   │   ├── Course.js         # Course with emotion affinity
│   │   └── Recommendation.js # Recommendation tracking
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   └── recommendationController.js
│   ├── services/
│   │   ├── mlRecommendationService.js    # Python ML integration
│   │   └── tagBasedRecommendationService.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   └── recommendationRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   └── server.js              # Main Express app
├── backendApiService.js       # Frontend service client
├── useBackendHooks.js         # React hooks for backend
├── seed.js                    # Database seeding
├── package.json
├── .env                       # Configuration
├── README.md                  # Full documentation
├── SETUP_GUIDE.md            # Setup instructions
└── FRONTEND_INTEGRATION.md   # React integration guide
```

---

## 🚀 Next Steps

1. **Start Backend**
   ```bash
   npm run dev
   ```

2. **Start Frontend** (in another terminal)
   ```bash
   npm run dev
   ```

3. **Start ML Engine** (in another terminal, in src/utils/)
   ```bash
   python emotion_recommendation_api.py
   ```

4. **Open Browser**
   Navigate to http://localhost:3000

5. **Login & Test**
   - Register new account
   - Select emotion on login
   - Get personalized recommendations
   - Rate courses

---

## 📞 Support

- **Backend Docs:** See `README.md`
- **Frontend Guide:** See `FRONTEND_INTEGRATION.md`
- **Setup Help:** See `SETUP_GUIDE.md`
- **Check Logs:** `npm run dev` shows all server output

---

## 🎓 Learning Path

1. Understand recommendation algorithm in README.md
2. Review API endpoints - try with cURL
3. Integrate into React using provided hooks
4. Test full flow: Register → Login → Get Recommendations
5. Customize emotion affinity scores in seed.js
6. Deploy when ready

Happy coding! 🚀
