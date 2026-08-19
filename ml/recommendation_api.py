"""
API Wrapper for ML Recommendation Engine
Provides Flask/FastAPI compatible endpoints and data processing utilities
"""

from ml_recommendation_engine import (
    RecommendationEngine,
    UserProfile,
    UserMood,
    Course,
    RecommendationSerializer
)
from typing import List, Dict, Any, Optional
import json
from dataclasses import asdict


class RecommendationAPI:
    """
    High-level API for course recommendations
    Can be integrated with Flask, FastAPI, or called directly
    """
    
    def __init__(self):
        self.engine = RecommendationEngine()
        self.all_courses: Dict[str, Course] = {}
    
    def load_courses_from_dict(self, courses_data: List[Dict[str, Any]]) -> None:
        """Load courses from dictionary (typically from MongoDB)"""
        self.all_courses = {}
        for course_data in courses_data:
            course = Course(
                id=course_data.get("id"),
                title=course_data.get("title"),
                category=course_data.get("category"),
                tags=course_data.get("tags", []),
                rating=course_data.get("rating", 0.0),
                students=course_data.get("students", 0),
                description=course_data.get("description", ""),
                duration_minutes=course_data.get("duration", 0),
                instructor=course_data.get("instructor", "")
            )
            self.all_courses[course.id] = course
    
    def get_mood_from_string(self, mood_str: str) -> UserMood:
        """Convert string to UserMood enum"""
        mood_map = {
            "energetic": UserMood.ENERGETIC,
            "calm": UserMood.CALM,
            "creative": UserMood.CREATIVE,
            "focused": UserMood.FOCUSED,
            "motivated": UserMood.MOTIVATED,
            "relaxed": UserMood.RELAXED,
            "curious": UserMood.CURIOUS,
            "inspired": UserMood.INSPIRED,
        }
        return mood_map.get(mood_str.lower(), UserMood.CURIOUS)
    
    def create_user_profile_from_dict(self, user_data: Dict[str, Any]) -> UserProfile:
        """Create UserProfile from dictionary"""
        return UserProfile(
            user_id=user_data.get("userId", ""),
            current_mood=self.get_mood_from_string(user_data.get("mood", "curious")),
            enrolled_courses=user_data.get("enrolledCourses", []),
            completed_courses=user_data.get("completedCourses", []),
            course_ratings=user_data.get("courseRatings", {}),
            interaction_history=user_data.get("interactionHistory", [])
        )
    
    def recommend(
        self,
        user_data: Dict[str, Any],
        num_recommendations: int = 5,
        include_breakdown: bool = True,
        mood_weight: float = 0.40,
        personalization_weight: float = 0.30,
        similarity_weight: float = 0.15,
        popularity_weight: float = 0.15
    ) -> Dict[str, Any]:
        """
        Main recommendation endpoint
        
        Args:
            user_data: {
                "userId": str,
                "mood": str (energetic|calm|creative|focused|motivated|relaxed|curious|inspired),
                "enrolledCourses": List[str],
                "completedCourses": List[str],
                "courseRatings": {courseId: rating}
            }
            num_recommendations: Number of courses to recommend
            include_breakdown: Include score breakdown in response
            mood_weight, personalization_weight, similarity_weight, popularity_weight: Score weights
        
        Returns:
            {
                "success": bool,
                "data": {
                    "recommendations": List[Dict],
                    "userMood": str,
                    "count": int
                },
                "error": Optional[str]
            }
        """
        try:
            if not self.all_courses:
                return {
                    "success": False,
                    "error": "No courses loaded. Call load_courses_from_dict() first."
                }
            
            user_profile = self.create_user_profile_from_dict(user_data)
            
            recommendations = self.engine.get_recommendations(
                user_profile,
                self.all_courses,
                num_recommendations,
                mood_weight=mood_weight,
                personalization_weight=personalization_weight,
                similarity_weight=similarity_weight,
                popularity_weight=popularity_weight
            )
            
            serialized = RecommendationSerializer.serialize_recommendations(
                recommendations,
                include_breakdown=include_breakdown
            )
            
            return {
                "success": True,
                "data": {
                    "recommendations": serialized,
                    "userMood": user_profile.current_mood.value,
                    "count": len(serialized),
                    "timestamp": datetime.now().isoformat()
                }
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def recommend_by_mood(
        self,
        user_data: Dict[str, Any],
        target_mood: Optional[str] = None,
        num_recommendations: int = 5,
        include_breakdown: bool = True
    ) -> Dict[str, Any]:
        """
        Get recommendations for a specific mood
        Useful for "Try something new" or mood-specific collections
        """
        try:
            if not self.all_courses:
                return {
                    "success": False,
                    "error": "No courses loaded"
                }
            
            user_profile = self.create_user_profile_from_dict(user_data)
            target = self.get_mood_from_string(target_mood) if target_mood else None
            
            recommendations = self.engine.get_recommendations_by_mood(
                user_profile,
                self.all_courses,
                target_mood=target,
                num_recommendations=num_recommendations
            )
            
            serialized = RecommendationSerializer.serialize_recommendations(
                recommendations,
                include_breakdown=include_breakdown
            )
            
            return {
                "success": True,
                "data": {
                    "recommendations": serialized,
                    "targetMood": target_mood or user_profile.current_mood.value,
                    "count": len(serialized)
                }
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_mood_options(self) -> Dict[str, Any]:
        """Return available mood options for UI"""
        return {
            "moods": [
                {
                    "id": "energetic",
                    "label": "Energetic",
                    "emoji": "⚡",
                    "description": "I feel full of energy and ready to take on challenges"
                },
                {
                    "id": "calm",
                    "label": "Calm",
                    "emoji": "🧘",
                    "description": "I feel peaceful and want to relax"
                },
                {
                    "id": "creative",
                    "label": "Creative",
                    "emoji": "🎨",
                    "description": "I feel inspired to create something new"
                },
                {
                    "id": "focused",
                    "label": "Focused",
                    "emoji": "🎯",
                    "description": "I want to learn something deep and technical"
                },
                {
                    "id": "motivated",
                    "label": "Motivated",
                    "emoji": "🚀",
                    "description": "I want to challenge myself and grow"
                },
                {
                    "id": "relaxed",
                    "label": "Relaxed",
                    "emoji": "😌",
                    "description": "I want a light, enjoyable learning experience"
                },
                {
                    "id": "curious",
                    "label": "Curious",
                    "emoji": "🔍",
                    "description": "I want to explore and discover new topics"
                },
                {
                    "id": "inspired",
                    "label": "Inspired",
                    "emoji": "✨",
                    "description": "I want to be inspired by creative excellence"
                }
            ]
        }
    
    def get_recommendation_stats(
        self,
        user_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get learning statistics and insights for user"""
        try:
            user_profile = self.create_user_profile_from_dict(user_data)
            
            # Calculate stats
            total_courses = len(user_profile.enrolled_courses)
            completed_courses = len(user_profile.completed_courses)
            in_progress = total_courses - completed_courses
            completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0
            
            # Get category distribution
            category_dist = {}
            for course_id in user_profile.enrolled_courses:
                if course_id in self.all_courses:
                    cat = self.all_courses[course_id].category
                    category_dist[cat] = category_dist.get(cat, 0) + 1
            
            # Get tag distribution
            tag_dist = {}
            for course_id in user_profile.completed_courses:
                if course_id in self.all_courses:
                    for tag in self.all_courses[course_id].tags:
                        tag_dist[tag] = tag_dist.get(tag, 0) + 1
            
            # Calculate average rating
            ratings = list(user_profile.course_ratings.values())
            avg_rating = sum(ratings) / len(ratings) if ratings else 0
            
            return {
                "success": True,
                "data": {
                    "totalCourses": total_courses,
                    "completedCourses": completed_courses,
                    "inProgressCourses": in_progress,
                    "completionRate": round(completion_rate, 2),
                    "averageRating": round(avg_rating, 2),
                    "categoryDistribution": category_dist,
                    "topTags": sorted(tag_dist.items(), key=lambda x: x[1], reverse=True)[:5],
                    "currentMood": user_profile.current_mood.value
                }
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Flask Integration Example
class FlaskRecommendationBlueprint:
    """
    Flask blueprint for recommendation endpoints
    
    Usage:
        from flask import Flask
        app = Flask(__name__)
        
        api = RecommendationAPI()
        # Load courses from DB
        courses = get_courses_from_db()
        api.load_courses_from_dict(courses)
        
        blueprint = FlaskRecommendationBlueprint(api)
        app.register_blueprint(blueprint.get_blueprint(), url_prefix='/api/recommendations')
    """
    
    def __init__(self, recommendation_api: RecommendationAPI):
        self.api = recommendation_api
    
    def get_blueprint(self):
        """Returns Flask blueprint with endpoints"""
        from flask import Blueprint, request, jsonify
        
        bp = Blueprint('recommendations', __name__)
        
        @bp.route('/mood-options', methods=['GET'])
        def mood_options():
            """Get available mood options"""
            return jsonify(self.api.get_mood_options())
        
        @bp.route('/recommend', methods=['POST'])
        def recommend():
            """Get personalized recommendations"""
            data = request.get_json()
            result = self.api.recommend(
                user_data=data,
                num_recommendations=data.get('numRecommendations', 5),
                include_breakdown=data.get('includeBreakdown', True)
            )
            return jsonify(result)
        
        @bp.route('/recommend-by-mood', methods=['POST'])
        def recommend_by_mood():
            """Get recommendations for specific mood"""
            data = request.get_json()
            result = self.api.recommend_by_mood(
                user_data=data,
                target_mood=data.get('targetMood'),
                num_recommendations=data.get('numRecommendations', 5)
            )
            return jsonify(result)
        
        @bp.route('/stats', methods=['POST'])
        def stats():
            """Get user learning statistics"""
            data = request.get_json()
            result = self.api.get_recommendation_stats(data)
            return jsonify(result)
        
        return bp


# FastAPI Integration Example
class FastAPIRecommendationRouter:
    """
    FastAPI router for recommendation endpoints
    
    Usage:
        from fastapi import FastAPI
        from pydantic import BaseModel
        
        app = FastAPI()
        
        api = RecommendationAPI()
        courses = get_courses_from_db()
        api.load_courses_from_dict(courses)
        
        router = FastAPIRecommendationRouter(api)
        app.include_router(router.get_router(), prefix='/api/recommendations')
    """
    
    def __init__(self, recommendation_api: RecommendationAPI):
        self.api = recommendation_api
    
    def get_router(self):
        """Returns FastAPI router with endpoints"""
        from fastapi import APIRouter
        
        router = APIRouter()
        
        @router.get("/mood-options")
        async def mood_options():
            """Get available mood options"""
            return self.api.get_mood_options()
        
        @router.post("/recommend")
        async def recommend(data: dict):
            """Get personalized recommendations"""
            result = self.api.recommend(
                user_data=data,
                num_recommendations=data.get('numRecommendations', 5),
                include_breakdown=data.get('includeBreakdown', True)
            )
            return result
        
        @router.post("/recommend-by-mood")
        async def recommend_by_mood(data: dict):
            """Get recommendations for specific mood"""
            result = self.api.recommend_by_mood(
                user_data=data,
                target_mood=data.get('targetMood'),
                num_recommendations=data.get('numRecommendations', 5)
            )
            return result
        
        @router.post("/stats")
        async def stats(data: dict):
            """Get user learning statistics"""
            result = self.api.get_recommendation_stats(data)
            return result
        
        return router


# Direct usage example
if __name__ == "__main__":
    from datetime import datetime
    
    # Initialize API
    api = RecommendationAPI()
    
    # Load sample courses
    sample_courses_data = [
        {
            "id": "1",
            "title": "Fundamentele Culinare",
            "category": "culinary",
            "tags": ["cooking", "culinary", "chef", "food", "practical"],
            "rating": 4.8,
            "students": 98200,
            "description": "Master culinary essentials",
            "duration": 252,
            "instructor": "Gordon Ramsay"
        },
        {
            "id": "2",
            "title": "Masterclass Fotografie",
            "category": "creative",
            "tags": ["photography", "creative", "artistic", "visual", "inspiring"],
            "rating": 4.9,
            "students": 145000,
            "description": "Learn photography from Annie Leibovitz",
            "duration": 225,
            "instructor": "Annie Leibovitz"
        },
        {
            "id": "3",
            "title": "Producție Muzicală",
            "category": "creative",
            "tags": ["music", "creative", "production", "tech", "intensive"],
            "rating": 4.7,
            "students": 87500,
            "description": "Electronic music production",
            "duration": 330,
            "instructor": "Deadmau5"
        },
        {
            "id": "4",
            "title": "Scriere Creativă",
            "category": "creative",
            "tags": ["writing", "creative", "storytelling", "relaxing", "inspiring"],
            "rating": 4.9,
            "students": 112000,
            "description": "Develop your unique voice",
            "duration": 195,
            "instructor": "Margaret Atwood"
        },
        {
            "id": "5",
            "title": "Yoga și Wellness",
            "category": "wellness",
            "tags": ["yoga", "wellness", "relaxing", "health", "gentle"],
            "rating": 4.7,
            "students": 234000,
            "description": "Find inner peace",
            "duration": 45,
            "instructor": "Yoga Master"
        }
    ]
    
    api.load_courses_from_dict(sample_courses_data)
    
    # Example user
    user_data = {
        "userId": "user_123",
        "mood": "creative",
        "enrolledCourses": ["1"],
        "completedCourses": ["1"],
        "courseRatings": {"1": 4.5}
    }
    
    # Get recommendations
    print("=" * 80)
    print("ML RECOMMENDATION ENGINE - API DEMONSTRATION")
    print("=" * 80)
    
    result = api.recommend(user_data, num_recommendations=3)
    print(json.dumps(result, indent=2))
    
    # Get stats
    print("\n" + "=" * 80)
    print("USER STATISTICS")
    print("=" * 80)
    
    stats = api.get_recommendation_stats(user_data)
    print(json.dumps(stats, indent=2))
    
    # Get mood options
    print("\n" + "=" * 80)
    print("AVAILABLE MOODS")
    print("=" * 80)
    
    moods = api.get_mood_options()
    print(json.dumps(moods, indent=2))
