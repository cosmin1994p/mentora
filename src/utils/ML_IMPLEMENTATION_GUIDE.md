# ML Course Recommendation Engine - Implementation Guide

## Overview

This is a complete machine learning-based course recommendation system that uses:
- **User Mood** - Current emotional state (8 moods)
- **Course History** - Enrolled and completed courses
- **Course Tags** - Semantic tags like "creative", "practical", "advanced"
- **Category Matching** - Course categories aligned with mood
- **Popularity Metrics** - Rating and student count

## Files Overview

### 1. `ml_recommendation_engine.py` (Core ML Engine)
**Location:** `src/utils/ml_recommendation_engine.py`

**Key Classes:**
- `UserMood` - Enum with 8 emotional states
- `Course` - Course data structure
- `UserProfile` - User's learning history and preferences
- `MoodCourseAffinityMatrix` - Mood→Category/Tag mappings
- `RecommendationEngine` - Main scoring algorithm
- `RecommendationSerializer` - JSON output formatting

**Main Algorithm:**
```
Final Score = 
  (Mood Score × 0.40) +
  (Personalization Score × 0.30) +
  (Content Similarity Score × 0.15) +
  (Popularity Score × 0.15)
```

### 2. `recommendation_api.py` (API Wrapper)
**Location:** `src/utils/recommendation_api.py`

**Key Classes:**
- `RecommendationAPI` - High-level API for recommendations
- `FlaskRecommendationBlueprint` - Flask integration
- `FastAPIRecommendationRouter` - FastAPI integration

**Methods:**
- `recommend()` - Get personalized recommendations
- `recommend_by_mood()` - Mood-specific recommendations
- `get_recommendation_stats()` - User learning statistics
- `get_mood_options()` - Available mood choices

### 3. `recommendationEngine.ts` (TypeScript Integration)
**Location:** `src/utils/recommendationEngine.ts`

**Key Classes:**
- `RecommendationService` - API client for React
- `LocalRecommendationEngine` - Client-side fallback
- `MoodUtils` - Utility functions for UI

### 4. `useRecommendations.ts` (React Hook)
**Location:** `src/utils/useRecommendations.ts`

**Hook for:**
- Managing recommendations state
- Fetching recommendations
- Getting user statistics
- Error handling

---

## Setup Instructions

### Step 1: Python Dependencies

Install required Python packages:

```bash
pip install numpy
```

No additional dependencies needed! The ML engine uses only NumPy (already likely installed).

### Step 2: Backend Setup (Flask Example)

Create a new file `backend/routes/recommendations.py`:

```python
from flask import Blueprint, request, jsonify
import sys
sys.path.insert(0, 'src/utils')

from recommendation_api import RecommendationAPI

# Initialize
rec_api = RecommendationAPI()

# Load courses from MongoDB (or your data source)
def load_courses():
    from app import db
    courses_data = db.courses.find({})
    rec_api.load_courses_from_dict(list(courses_data))

bp = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')

@bp.route('/mood-options', methods=['GET'])
def mood_options():
    return jsonify(rec_api.get_mood_options())

@bp.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    result = rec_api.recommend(
        user_data=data,
        num_recommendations=data.get('numRecommendations', 5),
        include_breakdown=data.get('includeBreakdown', True)
    )
    return jsonify(result)

@bp.route('/recommend-by-mood', methods=['POST'])
def recommend_by_mood():
    data = request.get_json()
    result = rec_api.recommend_by_mood(
        user_data=data,
        target_mood=data.get('targetMood'),
        num_recommendations=data.get('numRecommendations', 5)
    )
    return jsonify(result)

@bp.route('/stats', methods=['POST'])
def stats():
    data = request.get_json()
    result = rec_api.get_recommendation_stats(data)
    return jsonify(result)

def register_blueprint(app):
    load_courses()
    app.register_blueprint(bp)
```

In your main `app.py`:

```python
from flask import Flask
from routes.recommendations import register_blueprint

app = Flask(__name__)

# ... other setup ...

# Register recommendations blueprint
register_blueprint(app)
```

### Step 3: Frontend React Hook Usage

```typescript
// In your component
import { useRecommendations } from '@/utils/useRecommendations'
import { UserMood } from '@/utils/recommendationEngine'

function MyCourses() {
  const { 
    recommendations, 
    loading, 
    error,
    getRecommendations 
  } = useRecommendations({ userId: user.id })

  useEffect(() => {
    // When user selects mood and we have their history
    getRecommendations(
      UserMood.CREATIVE,
      user.enrolledCourses,
      user.completedCourses,
      user.courseRatings
    )
  }, [user])

  return (
    <div>
      {loading && <p>Loading recommendations...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {recommendations.map(course => (
        <CourseCard key={course.courseId} course={course} />
      ))}
    </div>
  )
}
```

---

## Data Format

### User Data Structure (for API calls)

```json
{
  "userId": "user_123",
  "mood": "creative",
  "enrolledCourses": ["course_1", "course_2"],
  "completedCourses": ["course_1"],
  "courseRatings": {
    "course_1": 4.5,
    "course_2": 3.8
  }
}
```

### Course Data Structure

```json
{
  "id": "course_1",
  "title": "Masterclass Fotografie",
  "category": "creative",
  "tags": ["photography", "creative", "artistic", "visual", "inspiring"],
  "rating": 4.9,
  "students": 145000,
  "description": "Learn photography from Annie Leibovitz",
  "duration": 225,
  "instructor": "Annie Leibovitz"
}
```

### Recommendation Response

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "courseId": "course_2",
        "title": "Producție Muzicală",
        "category": "creative",
        "instructor": "Deadmau5",
        "rating": 4.7,
        "studentsCount": 87500,
        "durationMinutes": 330,
        "tags": ["music", "creative", "production", "tech", "intensive"],
        "description": "Electronic music production",
        "recommendationScore": 87.3,
        "scoreBreakdown": {
          "moodScore": 85.0,
          "personalizationScore": 90.2,
          "similarityScore": 82.5,
          "popularityScore": 80.0
        }
      }
    ],
    "userMood": "creative",
    "count": 1
  }
}
```

---

## Available Moods

| Mood | ID | Emoji | Use Case |
|------|-------|--------|----------|
| Energetic | `energetic` | ⚡ | Ready to take on challenges |
| Calm | `calm` | 🧘 | Peaceful, want to relax |
| Creative | `creative` | 🎨 | Inspired to create |
| Focused | `focused` | 🎯 | Deep technical learning |
| Motivated | `motivated` | 🚀 | Challenge and growth |
| Relaxed | `relaxed` | 😌 | Light enjoyable learning |
| Curious | `curious` | 🔍 | Explore and discover |
| Inspired | `inspired` | ✨ | Creative excellence |

---

## Scoring Algorithm Explanation

### 1. **Mood Score** (40% weight)

Matches user's current mood to courses:
- Category affinity: Direct mood→category mapping
- Tag affinity: Average of relevant tags
- Formula: `(category_affinity × 0.5) + (tag_affinity × 0.5)`

**Example:**
- User mood: CREATIVE
- Course category: music (affinity: 0.80)
- Course tags: ["creative", "music", "inspiring"] (avg affinity: 0.85)
- Score: (0.80 × 0.5) + (0.85 × 0.5) = **0.825**

### 2. **Personalization Score** (30% weight)

Learns from user's history:
- Matches tags from completed courses
- Prefers similar categories
- Weights completed courses higher than enrolled

**Example:**
- User completed: Digital Photography (tags: photography, creative, visual)
- New course: Graphic Design (tags: design, creative, visual)
- Overlap: creative, visual (2/3 tags match)
- Score: **0.78** (high tag overlap with completed course)

### 3. **Content Similarity Score** (15% weight)

Recommends similar content:
- Jaccard similarity on tags
- Category matching
- Weights completed courses as primary reference

**Example:**
- User completed: Music Production (category: creative, tags: music, production)
- New course: Sound Design (category: creative, tags: audio, production)
- Similarity: **0.65** (shared production tag, same category)

### 4. **Popularity Score** (15% weight)

Balances with crowd wisdom:
- Student count normalized to 100k baseline
- Rating weight (60%) higher than count weight (40%)
- Formula: `(count_score × 0.4) + (rating_score × 0.6)`

**Example:**
- Course: 156k students, 5.0 rating
- Count: 156k/100k = capped at 1.0
- Rating: 5.0/5.0 = 1.0
- Score: (1.0 × 0.4) + (1.0 × 0.6) = **1.0**

---

## Integration Examples

### Example 1: Using in MoodModal Component

```typescript
import { useRecommendations } from '@/utils/useRecommendations'
import { UserMood } from '@/utils/recommendationEngine'

export function MoodModal() {
  const { recommendations, getRecommendations, loading } = useRecommendations({
    userId: currentUser.id
  })

  const handleMoodSelect = async (mood: UserMood) => {
    await getRecommendations(
      mood,
      currentUser.enrolledCourses,
      currentUser.completedCourses,
      currentUser.courseRatings,
      5
    )
    // Show recommended courses based on mood
  }

  return (
    // JSX to select mood and display recommendations
  )
}
```

### Example 2: Homepage Hero Section Recommendations

```typescript
export function HeroRecommendations() {
  const { recommendations, getRecommendations } = useRecommendations({
    userId: user.id
  })

  useEffect(() => {
    // Get recommendations on page load
    getRecommendations(
      user.selectedMood || UserMood.CURIOUS,
      user.enrolledCourses,
      user.completedCourses
    )
  }, [user])

  return (
    <section className="hero">
      <h2>Recommended for You</h2>
      <div className="grid">
        {recommendations.map(rec => (
          <div key={rec.courseId} className="card">
            <h3>{rec.title}</h3>
            <p className="score">{rec.recommendationScore}% match</p>
            <button>Enroll Now</button>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### Example 3: "Try Something New" Section

```typescript
function TryNewMood() {
  const { recommendations, getRecommendationsByMood } = useRecommendations({
    userId: user.id
  })

  const exploreMood = async (newMood: UserMood) => {
    await getRecommendationsByMood(
      user.currentMood,
      newMood,
      user.enrolledCourses,
      user.completedCourses,
      4
    )
  }

  return (
    <section>
      <h2>Try Something New</h2>
      <div className="mood-selector">
        {moods.map(mood => (
          <button onClick={() => exploreMood(mood.id)}>
            {mood.emoji} {mood.label}
          </button>
        ))}
      </div>
      <div className="recommendations">
        {recommendations.map(rec => (
          <MoodCard key={rec.courseId} rec={rec} />
        ))}
      </div>
    </section>
  )
}
```

---

## Performance Tips

1. **Cache recommendations**: Store results in Redux/Context to avoid repeat API calls
2. **Debounce requests**: Wait for user to finish selecting before making API call
3. **Pre-load data**: Load courses and user history on app startup
4. **Async loading**: Show skeleton loaders while fetching recommendations
5. **Batch updates**: Update user history after course completion, not in real-time

---

## Customization

### Adjust Scoring Weights

In Python:
```python
recommendations = engine.get_recommendations(
    user,
    all_courses,
    num_recommendations=5,
    mood_weight=0.50,           # Increase mood importance
    personalization_weight=0.25,
    similarity_weight=0.15,
    popularity_weight=0.10
)
```

### Add New Moods

1. Add to `UserMood` enum in both Python and TypeScript
2. Add category affinities to `MOOD_CATEGORY_MAP`
3. Add tag affinities to `MOOD_TAG_MAP`
4. Add UI properties to `MoodUtils`

### Customize Course Tags

Tags power the recommendation engine. Ensure your courses have relevant tags like:
- Skill level: `beginner`, `intermediate`, `advanced`
- Style: `practical`, `theoretical`, `hands-on`, `relaxing`
- Domain: `creative`, `technical`, `business`, `wellness`

---

## Testing

Run the Python module directly:

```bash
cd src/utils
python ml_recommendation_engine.py
```

This will display sample recommendations with scoring breakdown.

Run the API wrapper:

```bash
python recommendation_api.py
```

This shows JSON output ready for API consumption.

---

## Troubleshooting

**Issue:** Recommendations seem irrelevant
- **Solution:** Check user has completed courses (seed data helps)
- **Solution:** Verify course tags are accurate and meaningful

**Issue:** Same recommendations for different moods
- **Solution:** Ensure courses have diverse category/tag combinations
- **Solution:** Adjust scoring weights to prioritize mood more

**Issue:** Empty recommendations
- **Solution:** Check user hasn't already enrolled in all courses
- **Solution:** Verify courses exist in the database

---

## Next Steps

1. ✅ Copy Python files to `src/utils/`
2. ✅ Copy TypeScript files to `src/utils/`
3. Set up backend Flask/FastAPI routes
4. Integrate React hook in your components
5. Test with real user data
6. Monitor recommendation quality and adjust weights as needed

---

## Support & Customization

The system is fully customizable. You can:
- Adjust any scoring weights
- Add new moods and affinities
- Integrate with different backends
- Add A/B testing for recommendations
- Track which recommendations lead to course enrollments

Good luck with your recommendations! 🚀
