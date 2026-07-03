"""
ML Recommendation Engine - Integration Guide & Complete Example
Demonstrates how to integrate the ML recommendation system into your React app
"""

from advanced_ml_recommendation_api import (
    AdvancedRecommendationEngine,
    UserProfile,
    UserMood,
    Course,
    RecommendationSerializer
)
from mongo_db_manager import MongoDBManager
from datetime import datetime
import json


# ============================================================================
# COMPLETE INTEGRATION EXAMPLE
# ============================================================================

class StreamclassRecommendationService:
    """Complete recommendation service for Streamclass"""
    
    def __init__(self, mongodb_uri: str = None):
        """Initialize the recommendation service"""
        self.engine = AdvancedRecommendationEngine()
        self.db = MongoDBManager(mongodb_uri=mongodb_uri)
    
    def initialize_user(self, user_id: str, initial_mood: str):
        """Initialize a new user on first login"""
        user_data = {
            "current_mood": initial_mood,
            "learning_level": "beginner",
            "learning_style": "mixed"
        }
        
        result = self.db.create_user_profile(user_id, user_data)
        self.db.log_interaction(user_id, "signup", metadata={"mood": initial_mood})
        
        return result
    
    def get_recommendations(
        self,
        user_id: str,
        num_recommendations: int = 5,
        use_cache: bool = True
    ) -> str:
        """
        Get personalized recommendations for a user
        
        Returns JSON string with recommendations
        """
        
        # Get user profile from DB
        user_data = self.db.get_user_profile(user_id)
        if not user_data:
            return json.dumps({"error": "User not found"})
        
        current_mood = user_data.get("current_mood", "creative")
        
        # Check cache first
        if use_cache:
            cached = self.db.get_cached_recommendations(user_id, current_mood)
            if cached:
                return json.dumps({
                    "success": True,
                    "from_cache": True,
                    "recommendations": cached
                })
        
        # Create user profile for engine
        user_profile = UserProfile(
            user_id=user_id,
            current_mood=UserMood[current_mood.upper()],
            enrolled_courses=user_data.get("enrolled_courses", []),
            completed_courses=user_data.get("completed_courses", []),
            course_ratings=user_data.get("course_ratings", {}),
            watched_minutes=user_data.get("watched_minutes", {}),
            learning_level=user_data.get("learning_level", "beginner"),
            learning_style=user_data.get("learning_style", "mixed")
        )
        
        # Get all courses from DB
        all_courses_data = self.db.get_all_courses()
        
        # Convert to Course objects
        all_courses = {}
        for course_id, course_data in all_courses_data.items():
            all_courses[course_id] = Course(
                id=course_data.get("id"),
                title=course_data.get("title"),
                category=course_data.get("category"),
                tags=course_data.get("tags", []),
                rating=course_data.get("rating", 0),
                students=course_data.get("students", 0),
                description=course_data.get("description", ""),
                duration_minutes=course_data.get("duration_minutes", 0),
                instructor=course_data.get("instructor", ""),
                difficulty=course_data.get("difficulty", "intermediate"),
                language=course_data.get("language", "en"),
                thumbnail=course_data.get("thumbnail", ""),
                video_url=course_data.get("video_url", ""),
                created_date=str(course_data.get("created_date", "")),
                last_updated=str(course_data.get("last_updated", ""))
            )
        
        # Get recommendations
        recommendations = self.engine.get_recommendations(
            user_profile,
            all_courses,
            num_recommendations=num_recommendations
        )
        
        # Serialize
        json_output = RecommendationSerializer.to_json(
            recommendations,
            current_mood,
            user_id,
            include_breakdown=True
        )
        
        # Cache results
        serialized_recs = RecommendationSerializer.serialize(recommendations)
        self.db.cache_recommendations(user_id, current_mood, serialized_recs)
        
        # Log interaction
        self.db.log_interaction(
            user_id,
            "recommendation_requested",
            metadata={"count": len(recommendations), "mood": current_mood}
        )
        
        return json_output
    
    def enroll_course(self, user_id: str, course_id: str) -> dict:
        """Enroll user in a course"""
        success = self.db.add_enrolled_course(user_id, course_id)
        self.db.log_interaction(user_id, "enroll", course_id)
        
        return {
            "success": success,
            "user_id": user_id,
            "course_id": course_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def complete_course(self, user_id: str, course_id: str) -> dict:
        """Mark course as completed"""
        success = self.db.add_completed_course(user_id, course_id)
        self.db.log_interaction(user_id, "complete", course_id)
        
        return {
            "success": success,
            "user_id": user_id,
            "course_id": course_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def rate_course(self, user_id: str, course_id: str, rating: float) -> dict:
        """Rate a course"""
        success = self.db.rate_course(user_id, course_id, rating)
        self.db.log_interaction(
            user_id,
            "rate",
            course_id,
            metadata={"rating": rating}
        )
        
        return {
            "success": success,
            "user_id": user_id,
            "course_id": course_id,
            "rating": rating
        }
    
    def update_mood(self, user_id: str, new_mood: str) -> dict:
        """Update user's current mood"""
        success = self.db.update_mood(user_id, new_mood)
        self.db.log_interaction(
            user_id,
            "mood_changed",
            metadata={"mood": new_mood}
        )
        
        return {
            "success": success,
            "user_id": user_id,
            "new_mood": new_mood
        }
    
    def get_course_stats(self, course_id: str) -> dict:
        """Get course statistics"""
        return self.db.get_course_statistics(course_id)
    
    def search_courses(self, query: str, category: str = None) -> list:
        """Search courses"""
        return self.db.search_courses(query, category)


# ============================================================================
# SAMPLE DATA SETUP
# ============================================================================

def setup_sample_data(db_manager: MongoDBManager):
    """Setup sample courses for testing"""
    
    sample_courses = [
        {
            "id": "course_creative_001",
            "title": "Digital Painting Masterclass",
            "category": "creative",
            "tags": ["art", "digital", "creative", "visual", "artistic", "beginner"],
            "rating": 4.9,
            "students": 45000,
            "description": "Learn digital painting from industry professionals",
            "duration_minutes": 480,
            "instructor": "Professional Artist",
            "difficulty": "beginner",
            "language": "en"
        },
        {
            "id": "course_creative_002",
            "title": "Motion Graphics Essentials",
            "category": "creative",
            "tags": ["animation", "motion", "design", "video", "advanced", "creative"],
            "rating": 4.7,
            "students": 32000,
            "description": "Create stunning motion graphics animations",
            "duration_minutes": 360,
            "instructor": "Animation Expert",
            "difficulty": "intermediate"
        },
        {
            "id": "course_tech_001",
            "title": "Python Advanced Programming",
            "category": "tech",
            "tags": ["python", "programming", "coding", "advanced", "technical", "practical"],
            "rating": 4.8,
            "students": 89000,
            "description": "Master advanced Python concepts and design patterns",
            "duration_minutes": 540,
            "instructor": "Code Master",
            "difficulty": "advanced"
        },
        {
            "id": "course_tech_002",
            "title": "Web Development with React",
            "category": "tech",
            "tags": ["react", "web", "javascript", "frontend", "interactive", "practical"],
            "rating": 4.9,
            "students": 120000,
            "description": "Build modern web applications with React",
            "duration_minutes": 420,
            "instructor": "Frontend Guru",
            "difficulty": "intermediate"
        },
        {
            "id": "course_business_001",
            "title": "Business Strategy & Growth",
            "category": "business",
            "tags": ["business", "strategy", "management", "professional", "advanced"],
            "rating": 4.6,
            "students": 28000,
            "description": "Strategic planning for business growth",
            "duration_minutes": 300,
            "instructor": "Business Consultant",
            "difficulty": "advanced"
        },
        {
            "id": "course_wellness_001",
            "title": "Yoga for Beginners",
            "category": "wellness",
            "tags": ["yoga", "wellness", "health", "relaxing", "beginner", "meditative"],
            "rating": 4.8,
            "students": 67000,
            "description": "Start your yoga journey with expert guidance",
            "duration_minutes": 240,
            "instructor": "Yoga Master",
            "difficulty": "beginner"
        },
        {
            "id": "course_wellness_002",
            "title": "Mindfulness & Meditation",
            "category": "wellness",
            "tags": ["meditation", "mindfulness", "wellness", "relaxing", "peaceful"],
            "rating": 4.9,
            "students": 52000,
            "description": "Develop a mindfulness practice",
            "duration_minutes": 180,
            "instructor": "Meditation Expert",
            "difficulty": "beginner"
        },
        {
            "id": "course_culinary_001",
            "title": "Gourmet Cooking Basics",
            "category": "culinary",
            "tags": ["cooking", "culinary", "food", "practical", "hands-on", "beginner"],
            "rating": 4.7,
            "students": 38000,
            "description": "Learn essential cooking techniques",
            "duration_minutes": 360,
            "instructor": "Chef",
            "difficulty": "beginner"
        },
        {
            "id": "course_music_001",
            "title": "Music Production Basics",
            "category": "music",
            "tags": ["music", "production", "audio", "creative", "technical"],
            "rating": 4.8,
            "students": 41000,
            "description": "Create music from scratch",
            "duration_minutes": 420,
            "instructor": "Producer",
            "difficulty": "beginner"
        },
        {
            "id": "course_photography_001",
            "title": "Photography Masterclass",
            "category": "photography",
            "tags": ["photography", "visual", "creative", "artistic", "advanced"],
            "rating": 4.9,
            "students": 55000,
            "description": "Master photography techniques",
            "duration_minutes": 500,
            "instructor": "Photographer",
            "difficulty": "intermediate"
        }
    ]
    
    for course in sample_courses:
        try:
            db_manager.add_course(course)
            print(f"✓ Added course: {course['title']}")
        except Exception as e:
            print(f"✗ Error adding course {course['title']}: {str(e)}")


# ============================================================================
# DEMONSTRATION & TESTING
# ============================================================================

def demo_recommendation_flow():
    """Demonstrate complete recommendation flow"""
    
    print("=" * 80)
    print("STREAMCLASS ML RECOMMENDATION ENGINE - COMPLETE DEMO")
    print("=" * 80)
    
    # Initialize service
    service = StreamclassRecommendationService()
    
    # Setup sample data
    print("\n[1] Setting up sample courses...")
    setup_sample_data(service.db)
    
    # Create new user
    user_id = "demo_user_001"
    print(f"\n[2] Creating user: {user_id}")
    service.initialize_user(user_id, "creative")
    
    # Simulate user activity
    print("\n[3] Simulating user activity...")
    
    # User enrolls in courses
    service.enroll_course(user_id, "course_creative_001")
    print("   ✓ Enrolled in Digital Painting")
    
    service.enroll_course(user_id, "course_creative_002")
    print("   ✓ Enrolled in Motion Graphics")
    
    # User completes and rates
    service.complete_course(user_id, "course_creative_001")
    service.rate_course(user_id, "course_creative_001", 4.8)
    print("   ✓ Completed and rated Digital Painting")
    
    # Get recommendations
    print(f"\n[4] Getting recommendations for mood: creative")
    recommendations_json = service.get_recommendations(user_id, num_recommendations=5)
    recommendations = json.loads(recommendations_json)
    
    print("\n" + "=" * 80)
    print("PERSONALIZED RECOMMENDATIONS")
    print("=" * 80)
    
    for rec in recommendations.get("recommendations", []):
        print(f"\n#{rec['rank']} - {rec['title']}")
        print(f"   Instructor: {rec['instructor']}")
        print(f"   Category: {rec['category'].upper()}")
        print(f"   Difficulty: {rec['difficulty']}")
        print(f"   Rating: {'⭐' * int(rec['rating'])} ({rec['rating']}/5)")
        print(f"   Tags: {', '.join(rec['tags'][:5])}")
        print(f"   Duration: {rec['durationMinutes']} minutes")
        print(f"   RECOMMENDATION SCORE: {rec['recommendationScore']}%")
        
        if 'scoreBreakdown' in rec:
            breakdown = rec['scoreBreakdown']
            print(f"   Score Breakdown:")
            print(f"     - Mood Match: {breakdown['moodScore']}%")
            print(f"     - Personalization: {breakdown['personalizationScore']}%")
            print(f"     - Similarity: {breakdown['similarityScore']}%")
            print(f"     - Popularity: {breakdown['popularityScore']}%")
    
    # Change mood and get new recommendations
    print("\n" + "=" * 80)
    print("CHANGING MOOD TO: FOCUSED")
    print("=" * 80)
    
    service.update_mood(user_id, "focused")
    recommendations_json = service.get_recommendations(user_id, num_recommendations=3)
    recommendations = json.loads(recommendations_json)
    
    for rec in recommendations.get("recommendations", []):
        print(f"\n{rec['title']} - {rec['recommendationScore']}%")
    
    # Get analytics
    print("\n" + "=" * 80)
    print("COURSE ANALYTICS")
    print("=" * 80)
    
    stats = service.get_course_stats("course_creative_001")
    if stats:
        print(f"Course: {stats['title']}")
        print(f"Enrolled: {stats['enrolled_count']} | Completed: {stats['completed_count']}")
        print(f"Completion Rate: {stats['completion_rate']*100:.1f}%")
        print(f"Rating: {stats['platform_rating']}/5")
    
    # Close connection
    service.db.close()
    
    print("\n" + "=" * 80)
    print("DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    try:
        demo_recommendation_flow()
    except Exception as e:
        print(f"Error in demo: {str(e)}")
        import traceback
        traceback.print_exc()
