# ML-Based Course Recommendation Engine - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Usage Examples](#usage-examples)
9. [Algorithm Details](#algorithm-details)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

A sophisticated machine learning recommendation engine that provides personalized course recommendations based on:

- **User's Current Emotional State (Mood)** - Real-time mood selection
- **Learning History** - Enrolled and completed courses
- **User Preferences** - Course ratings and watched duration
- **Course Metadata** - Tags, categories, difficulty levels
- **Content Similarity** - Similar courses to what user has taken
- **Course Popularity** - Rating and student count

The system uses **hybrid recommendation** approach combining:
- **Content-based filtering** (mood + course metadata)
- **Collaborative filtering** (user history patterns)
- **Popularity-based ranking** (trending courses)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                            │
│           (MoodModal, CourseGrid, etc.)                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Requests
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            FLASK API LAYER                                   │
│  (advanced_ml_recommendation_api.py)                        │
├─────────────────────────────────────────────────────────────┤
│  POST /api/recommendations                                  │
│  POST /api/recommendations/by-mood                          │
│  GET /api/moods                                             │
│  GET /api/health                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│  ENGINE  │ │   DB     │ │   CACHE      │
│ (Score   │ │ (MongoDB)│ │ (Redis/Mongo)│
│Calculation)│ │         │ │              │
└──────────┘ └──────────┘ └──────────────┘
```

### Components

**1. AdvancedRecommendationEngine** (`advanced_ml_recommendation_api.py`)
- Calculates recommendation scores
- Combines multiple scoring factors
- Handles mood-based filtering

**2. MongoDBManager** (`mongo_db_manager.py`)
- User profile management
- Course database operations
- Interaction logging
- Recommendations caching
- Analytics

**3. RecommendationService** (`recommendation_integration.py`)
- High-level API
- Business logic
- User workflow management

---

## ✨ Features

### 1. **Mood-Based Recommendations**
- 10 different emotional states:
  - `energetic`, `calm`, `creative`, `focused`, `motivated`
  - `relaxed`, `curious`, `inspired`, `stressed`, `confused`
- Each mood maps to specific course categories and tags
- Dynamic difficulty preference based on mood

### 2. **User History Analysis**
- Tracks completed courses (weighted 2x higher)
- Tracks enrolled courses (weighted 1x)
- Analyzes course ratings
- Monitors watch time and progress
- Learning style preference

### 3. **Content Similarity**
- Tag overlap similarity (Jaccard similarity)
- Category matching with cross-category bonus
- Difficulty progression encouragement
- Natural learning path suggestions

### 4. **Intelligent Scoring**
```
Final Score = 
  (Mood Score × 0.35) +
  (Personalization Score × 0.25) +
  (Similarity Score × 0.15) +
  (Popularity Score × 0.15) +
  (Diversity Bonus × 0.05) +
  (Recency Bonus × 0.05)
```

### 5. **Diversity Encouragement**
- Bonus points for exploring new categories
- Prevents recommendation echo chambers
- Promotes learning outside comfort zone

### 6. **Performance Caching**
- 24-hour cache for recommendations
- Reduces computation time
- Configurable TTL

### 7. **Comprehensive Analytics**
- User interaction tracking
- Course performance statistics
- Completion rates
- Popularity metrics

---

## 🚀 Installation

### Prerequisites
- Python 3.8+
- MongoDB 4.4+ (local or Atlas)
- pip package manager

### Step 1: Install Python Dependencies

```bash
cd c:\Users\ghine\Downloads\Streamclass
pip install -r src/utils/requirements_ml.txt
```

### Step 2: Configure MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB from: https://www.mongodb.com/try/download/community
# Start MongoDB service
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`

### Step 3: Set Environment Variables

```bash
# Copy example config
copy .env.ml.example .env.ml

# Edit .env.ml with your settings
# Windows:
notepad .env.ml
```

---

## ⚙️ Configuration

### Environment Variables (.env.ml)

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=streamclass

# API
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# Recommendation weights (must sum to 1.0)
MOOD_WEIGHT=0.35
PERSONALIZATION_WEIGHT=0.25
SIMILARITY_WEIGHT=0.15
POPULARITY_WEIGHT=0.15
DIVERSITY_WEIGHT=0.05
RECENCY_WEIGHT=0.05

# Features
ENABLE_CACHE=True
ENABLE_INTERACTION_LOGGING=True
```

### Customizing Mood Affinities

Edit `advanced_ml_recommendation_api.py`:

```python
# Example: Add custom mood-to-category mapping
MOOD_CATEGORY_MAP = {
    UserMood.CREATIVE: {
        "design": 0.95,  # Very high affinity
        "tech": 0.65,    # Medium affinity
        # ... more categories
    }
}
```

---

## 📡 API Reference

### 1. Get Recommendations

**Endpoint:** `POST /api/recommendations`

**Request:**
```json
{
  "userId": "user_123",
  "currentMood": "creative",
  "enrolledCourses": ["course_1", "course_2"],
  "completedCourses": ["course_1"],
  "courseRatings": {
    "course_1": 4.5,
    "course_2": 3.8
  },
  "watchedMinutes": {
    "course_1": 150,
    "course_2": 45
  },
  "learningLevel": "intermediate",
  "learningStyle": "visual",
  "num_recommendations": 5
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-12-25T10:30:00",
  "userId": "user_123",
  "userMood": "creative",
  "recommendationCount": 5,
  "recommendations": [
    {
      "rank": 1,
      "courseId": "course_creative_001",
      "title": "Digital Painting Masterclass",
      "category": "creative",
      "instructor": "Artist Pro",
      "rating": 4.9,
      "studentsCount": 45000,
      "durationMinutes": 480,
      "difficulty": "beginner",
      "tags": ["art", "digital", "creative"],
      "description": "...",
      "recommendationScore": 92.45,
      "scoreBreakdown": {
        "moodScore": 95.0,
        "personalizationScore": 88.0,
        "similarityScore": 75.0,
        "popularityScore": 98.0,
        "diversityBonus": 20.0,
        "recencyBonus": 10.0
      }
    },
    // ... more recommendations
  ]
}
```

### 2. Get Mood-Specific Recommendations

**Endpoint:** `POST /api/recommendations/by-mood`

**Request:**
```json
{
  "userId": "user_123",
  "targetMood": "focused",
  "enrolledCourses": ["course_1"],
  "completedCourses": ["course_1"],
  "courseRatings": {"course_1": 4.5},
  "num_recommendations": 5
}
```

### 3. List Available Moods

**Endpoint:** `GET /api/moods`

**Response:**
```json
{
  "success": true,
  "moods": [
    "energetic", "calm", "creative", "focused", "motivated",
    "relaxed", "curious", "inspired", "stressed", "confused"
  ]
}
```

### 4. Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-25T10:30:00",
  "service": "ML Recommendation Engine"
}
```

---

## 🔌 Integration Guide

### Option 1: Direct Python Integration

```python
from recommendation_integration import StreamclassRecommendationService

# Initialize
service = StreamclassRecommendationService()

# Get recommendations
json_response = service.get_recommendations(
    user_id="user_123",
    num_recommendations=5
)

# Process response
import json
recommendations = json.loads(json_response)
```

### Option 2: Flask API (Recommended for React Frontend)

**Start the API server:**
```bash
python src/utils/advanced_ml_recommendation_api.py
```

Server runs on `http://localhost:5000`

**From React Frontend:**
```typescript
// TypeScript/React example
const getRecommendations = async (userId: string, mood: string) => {
  const response = await fetch('http://localhost:5000/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      currentMood: mood,
      enrolledCourses: user.enrolledCourses,
      completedCourses: user.completedCourses,
      courseRatings: user.courseRatings,
      num_recommendations: 5
    })
  });
  
  return response.json();
};
```

### Option 3: Using the RecommendationService Class

```python
from recommendation_integration import StreamclassRecommendationService

service = StreamclassRecommendationService()

# Initialize user
service.initialize_user("user_123", "creative")

# Enroll course
service.enroll_course("user_123", "course_001")

# Complete course
service.complete_course("user_123", "course_001")

# Rate course
service.rate_course("user_123", "course_001", 4.5)

# Change mood
service.update_mood("user_123", "focused")

# Get recommendations
recs = service.get_recommendations("user_123", num_recommendations=5)
```

---

## 💡 Usage Examples

### Example 1: Basic Recommendation Flow

```python
from recommendation_integration import StreamclassRecommendationService
import json

service = StreamclassRecommendationService()

# Step 1: User signs up and selects initial mood
service.initialize_user("user_001", "creative")

# Step 2: User gets recommendations
recs_json = service.get_recommendations("user_001", num_recommendations=5)
recommendations = json.loads(recs_json)

print(f"Found {recommendations['recommendationCount']} recommendations")
for rec in recommendations['recommendations']:
    print(f"{rec['title']} - Score: {rec['recommendationScore']}%")

# Step 3: User enrolls in a course
service.enroll_course("user_001", recommendations['recommendations'][0]['courseId'])

# Step 4: User completes course and rates it
course_id = recommendations['recommendations'][0]['courseId']
service.complete_course("user_001", course_id)
service.rate_course("user_001", course_id, 4.8)

# Step 5: Get updated recommendations (now considers completed course)
recs_json = service.get_recommendations("user_001", num_recommendations=5)
```

### Example 2: Mood-Based Recommendations

```python
from recommendation_integration import StreamclassRecommendationService

service = StreamclassRecommendationService()

# Get recommendations for "focused" mood (even if current mood is different)
user_id = "user_002"
user_data = service.db.get_user_profile(user_id)

if user_data:
    # Using direct engine for mood-specific
    from advanced_ml_recommendation_api import (
        AdvancedRecommendationEngine, UserProfile, UserMood, Course
    )
    
    engine = AdvancedRecommendationEngine()
    user_profile = UserProfile(
        user_id=user_id,
        current_mood=UserMood.FOCUSED,  # Override mood
        enrolled_courses=user_data['enrolled_courses'],
        completed_courses=user_data['completed_courses']
    )
    
    all_courses = service.db.get_all_courses()
    recs = engine.get_mood_specific_recommendations(
        user_profile,
        all_courses,
        num_recommendations=5
    )
```

### Example 3: Analyzing Course Statistics

```python
from recommendation_integration import StreamclassRecommendationService

service = StreamclassRecommendationService()

# Get course stats
stats = service.get_course_stats("course_001")

print(f"Course: {stats['title']}")
print(f"Enrolled: {stats['enrolled_count']}")
print(f"Completed: {stats['completed_count']}")
print(f"Completion Rate: {stats['completion_rate']*100:.1f}%")
print(f"Platform Rating: {stats['platform_rating']}/5")
```

---

## 🧠 Algorithm Details

### Mood Scoring

Each mood has affinity mappings to:

**Categories** (0.0 - 1.0 scale):
```
CREATIVE mood → creative (0.95) > design (0.90) > music (0.85) > ...
FOCUSED mood → tech (0.95) > business (0.90) > design (0.85) > ...
```

**Tags** (0.0 - 1.0 scale):
```
ENERGETIC mood → practical (0.90), intensive (0.85), challenging (0.85) > ...
CALM mood → relaxing (0.95), gentle (0.90), artistic (0.85) > ...
```

**Difficulty**:
```
STRESSED mood → beginner (0.95) > intermediate (0.70) > advanced (0.20)
FOCUSED mood → advanced (0.95) > intermediate (0.85) > beginner (0.30)
```

### Personalization Scoring

Based on user's learning history:

```python
personalization_score = (
    (category_preference * 0.5) +
    (tag_preference * 0.5)
)

Where preferences are normalized (0.0-1.0) from:
- Completed courses (weight × 1.5)
- Enrolled courses (weight × 1.0)
- User ratings
```

### Content Similarity

```python
similarity = (
    (tag_overlap * 0.5) +        # Jaccard similarity on tags
    (category_match * 0.3) +     # 1.0 if same category, 0.3 otherwise
    (difficulty_progression * 0.2) # Progression bonus
)
```

### Popularity Scoring

```python
popularity = (
    (normalized_students * 0.4) +  # Min(students/100k, 1.0)
    (rating_normalized * 0.6)       # rating / 5.0
)
```

### Final Score Calculation

```
final_score = 
  (mood_score × 0.35) +              # Highest weight - immediate preference
  (personalization_score × 0.25) +   # User history
  (similarity_score × 0.15) +        # Content-based
  (popularity_score × 0.15) +        # Trending/Quality
  (diversity_bonus × 0.05) +         # Exploration bonus
  (recency_bonus × 0.05)             # Recently updated

Result: 0.0 - 1.0 (converted to percentage for display)
```

---

## ⚡ Performance Optimization

### 1. Database Indexing

MongoDB indexes are automatically created:
```python
# User lookups by ID, mood, activity
user_profiles: [user_id], [current_mood], [last_active]

# Course filtering by category, tags
courses: [category], [tags], [rating], [students]

# Cache with automatic TTL expiration
recommendations_cache: [user_id], TTL 24 hours
```

### 2. Caching Strategy

**24-hour cache per user+mood combination:**
```python
cache_key = f"{user_id}:{mood}"
# Redis or MongoDB TTL expiration
```

**Cache invalidation triggers:**
- User enrolls/completes course
- User changes mood
- Manual cache clear

### 3. Query Optimization

```python
# Get all courses once, filter in-memory
all_courses = db.get_all_courses()  # Single DB query

# Batch user profile retrieval
user_data = db.get_user_profile(user_id)  # Indexed query
```

### 4. Async Processing (Future)

```python
# Can be implemented with:
# - Celery + Redis for background jobs
# - FastAPI instead of Flask
# - async/await patterns
```

---

## 🔧 Troubleshooting

### Issue: MongoDB Connection Failed

**Error:** `MongoServerSelectionTimeoutError`

**Solution:**
```bash
# Check MongoDB is running
mongod --version

# Check connection string in .env.ml
MONGODB_URI=mongodb://localhost:27017

# For Atlas, check:
# - Whitelist IP in Network Access
# - Use correct credentials
# - String format: mongodb+srv://...
```

### Issue: No Recommendations Generated

**Cause:** No courses in database or all courses enrolled

**Solution:**
```python
# Add sample courses
from recommendation_integration import setup_sample_data
setup_sample_data(service.db)

# Check user's enrolled courses
profile = service.db.get_user_profile(user_id)
print(profile['enrolled_courses'])
```

### Issue: Poor Recommendation Quality

**Solution:**
1. **Check user history completeness:**
   ```python
   profile = service.db.get_user_profile(user_id)
   # Ensure ratings, watched_minutes are set
   ```

2. **Adjust weight distribution in `.env.ml`:**
   ```env
   # Increase mood weight if mood is more important
   MOOD_WEIGHT=0.45
   PERSONALIZATION_WEIGHT=0.20
   ```

3. **Review course metadata:**
   ```python
   course = service.db.get_course(course_id)
   print(course['tags'])  # Ensure tags are descriptive
   print(course['category'])
   ```

### Issue: Performance Degradation

**Solution:**
1. Enable caching:
   ```env
   ENABLE_CACHE=True
   ```

2. Check database indexes:
   ```bash
   # In MongoDB
   db.user_profiles.getIndexes()
   db.courses.getIndexes()
   ```

3. Monitor slow queries:
   ```python
   # Add timing to functions
   import time
   start = time.time()
   result = engine.get_recommendations(...)
   print(f"Time: {time.time() - start}s")
   ```

---

## 📊 Monitoring & Analytics

### User Interaction Tracking

```python
# Automatically logged:
- signup
- mood_changed
- enroll
- complete
- rate
- view
- recommendation_requested

# Access:
interactions = service.db.get_user_interactions(user_id, days=30)
```

### Course Performance

```python
stats = service.get_course_stats(course_id)
# Returns:
# - enrollment count
# - completion count
# - completion rate
# - platform rating
```

### Most Popular Courses

```python
popular = service.db.get_popular_courses(limit=10, category="tech")
```

---

## 🚀 Deployment

### Local Development
```bash
python src/utils/advanced_ml_recommendation_api.py
```

### Production (Gunicorn)
```bash
gunicorn --workers 4 --bind 0.0.0.0:5000 \
  "advanced_ml_recommendation_api:create_app()"
```

### Docker Deployment
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements_ml.txt .
RUN pip install -r requirements_ml.txt
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "advanced_ml_recommendation_api:create_app()"]
```

---

## 📝 Summary

This ML recommendation engine provides:

✅ **Mood-based filtering** - 10 emotional states mapped to courses
✅ **Personalized recommendations** - Based on complete user history
✅ **Content similarity** - Smart course progression
✅ **Popularity integration** - Trending and highly-rated courses
✅ **Performance caching** - 24-hour intelligent caching
✅ **MongoDB persistence** - Complete data management
✅ **REST API** - Easy Flask integration
✅ **Analytics** - User interaction tracking
✅ **Flexibility** - Customizable weights and affinities

Ready for production deployment! 🎉
