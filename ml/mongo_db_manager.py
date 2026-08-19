"""
MongoDB Integration for ML Recommendation Engine
Handles data persistence, caching, and user profile management
"""

from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
import os
from dotenv import load_dotenv
import json
from enum import Enum

load_dotenv()

logger = logging.getLogger(__name__)


class DBConnectionError(Exception):
    """Custom exception for database connection errors"""
    pass


class MongoDBManager:
    """MongoDB connection and data management"""
    
    def __init__(
        self,
        mongodb_uri: str = None,
        db_name: str = "masterclass",
        timeout: int = 5000
    ):
        """
        Initialize MongoDB connection
        
        Args:
            mongodb_uri: MongoDB connection string
            db_name: Database name
            timeout: Connection timeout in ms
        """
        
        # Get URI from parameter or environment
        self.mongodb_uri = mongodb_uri or os.getenv(
            "MONGODB_URI",
            "mongodb://localhost:27017"
        )
        self.db_name = db_name
        self.timeout = timeout
        self.client = None
        self.db = None
        
        self._connect()
    
    def _connect(self):
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(
                self.mongodb_uri,
                serverSelectionTimeoutMS=self.timeout,
                connectTimeoutMS=self.timeout,
                retryWrites=True
            )
            
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            
            logger.info(f"Connected to MongoDB database: {self.db_name}")
            self._create_indexes()
        
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise DBConnectionError(f"MongoDB connection failed: {str(e)}")
    
    def _create_indexes(self):
        """Create necessary database indexes for performance"""
        
        try:
            # User profiles index
            self.db.user_profiles.create_index([("user_id", ASCENDING)], unique=True)
            self.db.user_profiles.create_index([("current_mood", ASCENDING)])
            self.db.user_profiles.create_index([("last_active", ASCENDING)])
            
            # Courses index
            self.db.courses.create_index([("id", ASCENDING)], unique=True)
            self.db.courses.create_index([("category", ASCENDING)])
            self.db.courses.create_index([("tags", ASCENDING)])
            self.db.courses.create_index([("rating", ASCENDING)])
            self.db.courses.create_index([("students", ASCENDING)])
            
            # Recommendations cache index
            self.db.recommendations_cache.create_index([("user_id", ASCENDING)])
            self.db.recommendations_cache.create_index([("created_at", ASCENDING)])
            self.db.recommendations_cache.create_index(
                [("created_at", ASCENDING)],
                expireAfterSeconds=86400  # 24-hour TTL
            )
            
            # User interactions index
            self.db.user_interactions.create_index([("user_id", ASCENDING)])
            self.db.user_interactions.create_index([("course_id", ASCENDING)])
            self.db.user_interactions.create_index([("timestamp", ASCENDING)])
            
            logger.info("Database indexes created")
        except Exception as e:
            # Ignore index already exists errors
            if "IndexOptionsConflict" in str(e) or "already exists" in str(e):
                logger.warning(f"Indexes already exist or have different options: {str(e)}")
            else:
                raise
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    # ========================================================================
    # USER PROFILE OPERATIONS
    # ========================================================================
    
    def create_user_profile(
        self,
        user_id: str,
        user_data: Dict[str, Any]
    ) -> Dict:
        """Create a new user profile"""
        try:
            profile = {
                "user_id": user_id,
                "current_mood": user_data.get("current_mood", "neutral"),
                "enrolled_courses": user_data.get("enrolled_courses", []),
                "completed_courses": user_data.get("completed_courses", []),
                "course_ratings": user_data.get("course_ratings", {}),
                "watched_minutes": user_data.get("watched_minutes", {}),
                "learning_level": user_data.get("learning_level", "beginner"),
                "learning_style": user_data.get("learning_style", "mixed"),
                "created_at": datetime.now(),
                "last_active": datetime.now(),
                "interaction_history": []
            }
            
            result = self.db.user_profiles.insert_one(profile)
            logger.info(f"Created user profile: {user_id}")
            return {"success": True, "user_id": user_id, "profile_id": str(result.inserted_id)}
        
        except Exception as e:
            logger.error(f"Error creating user profile: {str(e)}")
            raise
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Retrieve user profile"""
        try:
            profile = self.db.user_profiles.find_one({"user_id": user_id})
            if profile:
                profile.pop("_id", None)  # Remove MongoDB ID
            return profile
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            return None
    
    def update_user_profile(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update user profile"""
        try:
            updates["last_active"] = datetime.now()
            
            result = self.db.user_profiles.update_one(
                {"user_id": user_id},
                {"$set": updates}
            )
            
            logger.info(f"Updated user profile: {user_id}")
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            raise
    
    def update_mood(self, user_id: str, mood: str) -> bool:
        """Update user's current mood"""
        return self.update_user_profile(user_id, {"current_mood": mood})
    
    def add_enrolled_course(self, user_id: str, course_id: str) -> bool:
        """Add course to user's enrolled list"""
        try:
            self.db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"enrolled_courses": course_id},
                    "$set": {"last_active": datetime.now()}
                }
            )
            logger.info(f"User {user_id} enrolled in course {course_id}")
            return True
        except Exception as e:
            logger.error(f"Error enrolling user: {str(e)}")
            return False
    
    def add_completed_course(self, user_id: str, course_id: str) -> bool:
        """Mark course as completed"""
        try:
            self.db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"completed_courses": course_id},
                    "$pull": {"enrolled_courses": course_id},
                    "$set": {"last_active": datetime.now()}
                }
            )
            logger.info(f"User {user_id} completed course {course_id}")
            return True
        except Exception as e:
            logger.error(f"Error marking course as completed: {str(e)}")
            return False
    
    def rate_course(self, user_id: str, course_id: str, rating: float) -> bool:
        """Rate a course"""
        try:
            rating = max(0, min(5, rating))  # Clamp 0-5
            
            self.db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        f"course_ratings.{course_id}": rating,
                        "last_active": datetime.now()
                    }
                }
            )
            logger.info(f"User {user_id} rated course {course_id}: {rating}")
            return True
        except Exception as e:
            logger.error(f"Error rating course: {str(e)}")
            return False
    
    def record_watch_time(self, user_id: str, course_id: str, minutes: int) -> bool:
        """Record course watch time"""
        try:
            current = self.db.user_profiles.find_one(
                {"user_id": user_id},
                {"watched_minutes": 1}
            )
            
            if current:
                current_minutes = current.get("watched_minutes", {}).get(course_id, 0)
                new_minutes = current_minutes + minutes
                
                self.db.user_profiles.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            f"watched_minutes.{course_id}": new_minutes,
                            "last_active": datetime.now()
                        }
                    }
                )
                logger.info(f"User {user_id} watched {minutes} minutes of course {course_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error recording watch time: {str(e)}")
            return False
    
    # ========================================================================
    # COURSE OPERATIONS
    # ========================================================================
    
    def add_course(self, course_data: Dict[str, Any]) -> str:
        """Add a course to the database"""
        try:
            course = {
                "id": course_data.get("id"),
                "title": course_data.get("title"),
                "category": course_data.get("category"),
                "tags": course_data.get("tags", []),
                "rating": course_data.get("rating", 0),
                "students": course_data.get("students", 0),
                "description": course_data.get("description", ""),
                "duration_minutes": course_data.get("duration_minutes", 0),
                "instructor": course_data.get("instructor", ""),
                "difficulty": course_data.get("difficulty", "intermediate"),
                "language": course_data.get("language", "en"),
                "thumbnail": course_data.get("thumbnail", ""),
                "video_url": course_data.get("video_url", ""),
                "created_date": datetime.now(),
                "last_updated": datetime.now()
            }
            
            result = self.db.courses.insert_one(course)
            logger.info(f"Added course: {course_data.get('id')}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error adding course: {str(e)}")
            raise
    
    def get_course(self, course_id: str) -> Optional[Dict]:
        """Retrieve a course"""
        try:
            course = self.db.courses.find_one({"id": course_id})
            if course:
                course.pop("_id", None)
            return course
        except Exception as e:
            logger.error(f"Error retrieving course: {str(e)}")
            return None
    
    def get_courses_by_category(self, category: str, limit: int = 50) -> List[Dict]:
        """Get courses by category"""
        try:
            courses = list(
                self.db.courses.find(
                    {"category": category.lower()},
                    {"_id": 0}
                ).limit(limit)
            )
            return courses
        except Exception as e:
            logger.error(f"Error retrieving courses by category: {str(e)}")
            return []
    
    def get_courses_by_tags(self, tags: List[str], limit: int = 50) -> List[Dict]:
        """Get courses by tags"""
        try:
            courses = list(
                self.db.courses.find(
                    {"tags": {"$in": tags}},
                    {"_id": 0}
                ).limit(limit)
            )
            return courses
        except Exception as e:
            logger.error(f"Error retrieving courses by tags: {str(e)}")
            return []
    
    def get_all_courses(self) -> Dict[str, Dict]:
        """Get all courses as dict"""
        try:
            courses = {}
            for course in self.db.courses.find({}, {"_id": 0}):
                courses[course["id"]] = course
            return courses
        except Exception as e:
            logger.error(f"Error retrieving all courses: {str(e)}")
            return {}
    
    def search_courses(
        self,
        query: str,
        category: Optional[str] = None,
        min_rating: float = 0.0,
        limit: int = 20
    ) -> List[Dict]:
        """Search courses by title, description, or tags"""
        try:
            filters = {
                "$text": {"$search": query}
            }
            
            if category:
                filters["category"] = category.lower()
            
            if min_rating > 0:
                filters["rating"] = {"$gte": min_rating}
            
            courses = list(
                self.db.courses.find(
                    filters,
                    {"_id": 0, "score": {"$meta": "textScore"}}
                ).sort([("score", {"$meta": "textScore"})])
                .limit(limit)
            )
            
            return courses
        except Exception as e:
            logger.error(f"Error searching courses: {str(e)}")
            return []
    
    # ========================================================================
    # RECOMMENDATIONS CACHING
    # ========================================================================
    
    def cache_recommendations(
        self,
        user_id: str,
        mood: str,
        recommendations: List[Dict],
        ttl_hours: int = 24
    ) -> bool:
        """Cache recommendations for a user"""
        try:
            cache_entry = {
                "user_id": user_id,
                "mood": mood,
                "recommendations": recommendations,
                "created_at": datetime.now(),
                "expires_at": datetime.now() + timedelta(hours=ttl_hours)
            }
            
            self.db.recommendations_cache.insert_one(cache_entry)
            logger.info(f"Cached recommendations for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error caching recommendations: {str(e)}")
            return False
    
    def get_cached_recommendations(
        self,
        user_id: str,
        mood: str
    ) -> Optional[List[Dict]]:
        """Retrieve cached recommendations"""
        try:
            cache = self.db.recommendations_cache.find_one({
                "user_id": user_id,
                "mood": mood,
                "expires_at": {"$gt": datetime.now()}
            })
            
            if cache:
                logger.info(f"Retrieved cached recommendations for user {user_id}")
                return cache.get("recommendations", [])
            return None
        except Exception as e:
            logger.error(f"Error retrieving cached recommendations: {str(e)}")
            return None
    
    # ========================================================================
    # USER INTERACTIONS TRACKING
    # ========================================================================
    
    def log_interaction(
        self,
        user_id: str,
        interaction_type: str,
        course_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Log user interaction"""
        try:
            interaction = {
                "user_id": user_id,
                "interaction_type": interaction_type,  # view, click, enroll, rate, etc
                "course_id": course_id,
                "timestamp": datetime.now(),
                "metadata": metadata or {}
            }
            
            self.db.user_interactions.insert_one(interaction)
            
            # Also update user profile interaction history
            self.db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$push": {
                        "interaction_history": {
                            "$each": [interaction],
                            "$slice": -100  # Keep last 100 interactions
                        }
                    }
                }
            )
            
            return True
        except Exception as e:
            logger.error(f"Error logging interaction: {str(e)}")
            return False
    
    def get_user_interactions(
        self,
        user_id: str,
        days: int = 30
    ) -> List[Dict]:
        """Get user interactions from last N days"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            interactions = list(
                self.db.user_interactions.find(
                    {
                        "user_id": user_id,
                        "timestamp": {"$gte": start_date}
                    },
                    {"_id": 0}
                ).sort("timestamp", -1)
            )
            return interactions
        except Exception as e:
            logger.error(f"Error retrieving interactions: {str(e)}")
            return []
    
    # ========================================================================
    # ANALYTICS
    # ========================================================================
    
    def get_course_statistics(self, course_id: str) -> Dict:
        """Get course statistics"""
        try:
            course = self.db.courses.find_one({"id": course_id})
            if not course:
                return {}
            
            # Get completion and enrollment info
            enrolled_count = self.db.user_profiles.count_documents(
                {"enrolled_courses": course_id}
            )
            completed_count = self.db.user_profiles.count_documents(
                {"completed_courses": course_id}
            )
            
            # Get average rating from users
            ratings_pipeline = [
                {
                    "$match": {
                        "course_ratings": {"$exists": True}
                    }
                },
                {
                    "$addFields": {
                        "course_rating": {"$arrayElemAt": [
                            {"$objectToArray": "$course_ratings"},
                            0
                        ]}
                    }
                }
            ]
            
            stats = {
                "course_id": course_id,
                "title": course.get("title"),
                "enrolled_count": enrolled_count,
                "completed_count": completed_count,
                "completion_rate": completed_count / max(enrolled_count, 1),
                "platform_rating": course.get("rating", 0),
                "total_students": course.get("students", 0)
            }
            
            return stats
        except Exception as e:
            logger.error(f"Error getting course statistics: {str(e)}")
            return {}
    
    def get_popular_courses(
        self,
        limit: int = 10,
        category: Optional[str] = None
    ) -> List[Dict]:
        """Get most popular courses"""
        try:
            query = {}
            if category:
                query["category"] = category.lower()
            
            courses = list(
                self.db.courses.find(query, {"_id": 0})
                .sort([("rating", -1), ("students", -1)])
                .limit(limit)
            )
            
            return courses
        except Exception as e:
            logger.error(f"Error retrieving popular courses: {str(e)}")
            return []


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    try:
        # Initialize DB manager
        db = MongoDBManager()
        
        # Test operations
        print("Testing MongoDB operations...")
        
        # Create user profile
        user_data = {
            "current_mood": "creative",
            "learning_level": "intermediate",
            "learning_style": "visual"
        }
        db.create_user_profile("user_test_123", user_data)
        print("✓ User profile created")
        
        # Add courses
        course_data = {
            "id": "course_001",
            "title": "Advanced Python Programming",
            "category": "tech",
            "tags": ["python", "programming", "advanced"],
            "rating": 4.8,
            "students": 15000,
            "description": "Master Python programming",
            "duration_minutes": 300,
            "instructor": "Guido van Rossum",
            "difficulty": "advanced"
        }
        db.add_course(course_data)
        print("✓ Course added")
        
        # Get user profile
        profile = db.get_user_profile("user_test_123")
        print(f"✓ Retrieved profile: {profile['user_id']}")
        
        # Update user
        db.update_mood("user_test_123", "focused")
        print("✓ Updated user mood")
        
        # Log interaction
        db.log_interaction("user_test_123", "view", "course_001")
        print("✓ Logged interaction")
        
        print("\nAll tests passed!")
        
        db.close()
    
    except Exception as e:
        print(f"Error: {str(e)}")
