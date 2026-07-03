# Frontend Integration Guide - Backend API

Ghid complet pentru integrarea backend-ului Node.js cu aplicația React.

## Setup

### 1. Copy API Service Files

```bash
# Copy backendApiService.js la src/utils/
cp backend/backendApiService.js src/utils/

# Copy React hooks la src/utils/
cp backend/useBackendHooks.js src/utils/
```

### 2. Environment Variables (Frontend .env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ML_API_URL=http://localhost:5001/api
```

### 3. Import în Components

```typescript
// App.tsx
import backendApiService from './utils/backendApiService';
import { useAuth, useRecommendations, useCourses } from './utils/useBackendHooks';
```

## Usage Examples

### Authentication

```typescript
import { useAuth } from './utils/useBackendHooks';

export const LoginModal = () => {
  const { login, loading, error } = useAuth();

  const handleLogin = async (email, password, emotion) => {
    try {
      const result = await login(email, password, emotion, 'RIDICATA');
      console.log('Logged in:', result.user);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <select>
        <option>MOTIVAT</option>
        <option>FERICIT</option>
        <option>RELAXAT</option>
        <option>CURIOS</option>
        <option>PRODUCTIV</option>
        <option>CREATIV</option>
      </select>
      <button onClick={handleLogin} disabled={loading}>
        Login
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### Get Recommendations

```typescript
import { useRecommendations } from './utils/useBackendHooks';

export const RecommendationsView = () => {
  const { 
    recommendations, 
    loading, 
    mlHealthy, 
    fetchRecommendations,
    recordInteraction 
  } = useRecommendations();

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleEnroll = async (courseId) => {
    await recordInteraction(courseId, 'enroll');
    // Update UI
  };

  return (
    <div>
      {!mlHealthy && <p>⚠️ ML engine is offline</p>}
      {loading ? (
        <p>Loading recommendations...</p>
      ) : (
        <div className="recommendations">
          {recommendations.map(rec => (
            <div key={rec._id} className="recommendation-card">
              <h3>{rec.title}</h3>
              <p>Score: {rec.score.toFixed(1)}%</p>
              <p>Source: {rec.source}</p>
              {rec.explanation && <p>{rec.explanation}</p>}
              <button onClick={() => handleEnroll(rec._id)}>Enroll</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Update User Emotion

```typescript
import { useAuth } from './utils/useBackendHooks';

export const MoodSelector = () => {
  const { user, updateEmotion } = useAuth();

  const emotions = ['FERICIT', 'MOTIVAT', 'RELAXAT', 'CURIOS', 'PRODUCTIV', 'CREATIV'];

  const handleMoodChange = async (emotion) => {
    await updateEmotion(emotion, 'MEDIE');
    // Recommendations will update automatically
  };

  return (
    <div className="mood-selector">
      <p>Current mood: {user?.currentEmotion}</p>
      <div className="mood-buttons">
        {emotions.map(emotion => (
          <button 
            key={emotion}
            onClick={() => handleMoodChange(emotion)}
            className={emotion === user?.currentEmotion ? 'active' : ''}
          >
            {emotion}
          </button>
        ))}
      </div>
    </div>
  );
};
```

### Course Search

```typescript
import { useCourses } from './utils/useBackendHooks';

export const CourseSearch = () => {
  const { courses, categories, fetchCourses, loading } = useCourses();
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchCourses({ category: selectedCategory });
  }, [selectedCategory, fetchCourses]);

  return (
    <div>
      <select 
        value={selectedCategory} 
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course._id} className="course-card">
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <p>Duration: {course.duration} min</p>
              <p>Rating: {course.rating}/5</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Full Integration Example

```typescript
// App.tsx
import { useAuth, useRecommendations, useCourses } from './utils/useBackendHooks';

export default function App() {
  const { user, isAuthenticated, login, logout, updateEmotion } = useAuth();
  const { recommendations, fetchRecommendations, recordInteraction } = useRecommendations();
  const { courses, fetchCourses } = useCourses();

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations();
      fetchCourses();
    }
  }, [isAuthenticated, fetchRecommendations, fetchCourses]);

  return (
    <div className="app">
      {isAuthenticated ? (
        <div>
          <header>
            <h1>Welcome, {user?.username}</h1>
            <p>Emotion: {user?.currentEmotion}</p>
            <button onClick={logout}>Logout</button>
          </header>

          <section className="mood-selector">
            <h2>How are you feeling today?</h2>
            {/* Mood buttons to update emotion */}
          </section>

          <section className="recommendations">
            <h2>Recommended for you</h2>
            {/* Render recommendations */}
          </section>

          <section className="courses">
            <h2>All Courses</h2>
            {/* Render all courses */}
          </section>
        </div>
      ) : (
        <LoginModal onLogin={login} />
      )}
    </div>
  );
}
```

## Error Handling

```typescript
// All hooks return error state
const { 
  error, 
  loading, 
  fetchRecommendations 
} = useRecommendations();

// Check for API errors
try {
  await fetchRecommendations();
} catch (err) {
  if (err.message.includes('401')) {
    // Unauthorized - redirect to login
    redirectToLogin();
  } else if (err.message.includes('500')) {
    // Server error
    showErrorNotification('Server error, please try again later');
  }
}
```

## Backend Health Check

```typescript
// Check if backend is running
import backendApiService from './utils/backendApiService';

const isBackendHealthy = await backendApiService.checkHealth();
if (!isBackendHealthy) {
  console.warn('Backend is offline');
}
```

## Data Flow Diagram

```
React Component
    ↓
useAuth / useRecommendations / useCourses hooks
    ↓
backendApiService (fetch calls)
    ↓
Node.js Backend API (localhost:5000)
    ↓
MongoDB Atlas (cloud database)
MongoDB local (alternate)
    ↓
Python ML Engine (localhost:5001) [optional]
```

## API Response Examples

### Login Response
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "username": "tudor",
    "email": "tudor@example.com",
    "currentEmotion": "MOTIVAT",
    "currentEnergyLevel": "RIDICATA",
    "preferredTags": ["Machine Learning", "Python"],
    "enrolledCourses": 3,
    "completedCourses": 1
  },
  "token": "jwt_token_here"
}
```

### Recommendations Response
```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "course_id",
      "title": "Advanced Deep Learning",
      "description": "...",
      "category": "Data Science",
      "tags": ["AI", "Deep Learning", "TensorFlow"],
      "score": 92.5,
      "source": "ml",
      "matchFactors": {
        "emotionMatch": 0.95,
        "tagMatch": 0.88,
        "popularityScore": 0.75,
        "mlScore": 92.5
      },
      "explanation": "Matched based on your MOTIVAT emotion and interest in Deep Learning"
    }
  ],
  "mlHealthy": true,
  "userEmotion": "MOTIVAT"
}
```

## Common Issues

### CORS Error
```
Access to XMLHttpRequest at 'http://localhost:5000/api/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:** Backend CORS is configured, make sure:
1. Frontend URL is in CORS whitelist (default: localhost:3000)
2. Credentials: true in fetch options if needed

### Token Expired
Backend returns 403 Forbidden when JWT token expires.

**Solution:** 
```typescript
// In backendApiService.js
if (response.status === 403) {
  // Clear token and redirect to login
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

### ML API Offline
Recommendations work with fallback if Python ML engine is down.

**Solution:** Check mlHealthy flag in response
```typescript
if (!mlHealthy) {
  console.warn('ML engine offline, using tag-based recommendations');
}
```

## Performance Optimization

### Caching Recommendations
```typescript
// Cache recommendations for 5 minutes
const cacheRecommendations = (recs) => {
  localStorage.setItem('cached_recs', JSON.stringify({
    data: recs,
    timestamp: Date.now()
  }));
};

const getCachedRecommendations = () => {
  const cached = localStorage.getItem('cached_recs');
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > 5 * 60 * 1000) return null; // 5 min expired
  
  return data;
};
```

### Debounce Emotion Updates
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdateEmotion = useDebouncedCallback(async (emotion) => {
  await updateEmotion(emotion, 'MEDIE');
}, 500);
```

## Next Steps

1. Copy service files to frontend
2. Update environment variables
3. Replace existing API calls with new hooks
4. Test login flow
5. Test recommendations
6. Monitor backend logs for errors

## Support

For issues:
1. Check backend logs: `npm run dev`
2. Verify MongoDB connection
3. Check ML API on localhost:5001
4. Review browser console for errors
