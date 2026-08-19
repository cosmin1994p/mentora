"""
ML-based Course Recommendation Engine
Uses mood, user history, and course tags to provide personalized recommendations
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')


class UserMood(Enum):
    """User emotional states"""
    ENERGETIC = "energetic"
    CALM = "calm"
    CREATIVE = "creative"
    FOCUSED = "focused"
    MOTIVATED = "motivated"
    RELAXED = "relaxed"
    CURIOUS = "curious"
    INSPIRED = "inspired"


@dataclass
class Course:
    """Course data structure"""
    id: str
    title: str
    category: str
    tags: List[str]
    rating: float
    students: int
    description: str
    duration_minutes: int
    instructor: str


@dataclass
class UserProfile:
    """User profile with history and preferences"""
    user_id: str
    current_mood: UserMood
    enrolled_courses: List[str]  # Course IDs
    completed_courses: List[str]  # Course IDs
    course_ratings: Dict[str, float]  # {course_id: rating}
    interaction_history: List[Dict]  # Past interactions


class MoodCourseAffinityMatrix:
    """
    Maps emotional states to course characteristics
    Higher values = stronger affinity
    """
    
    # Mood -> Category affinity mapping
    MOOD_CATEGORY_MAP = {
        UserMood.ENERGETIC: {
            "sports": 0.95, "business": 0.85, "music": 0.80,
            "creative": 0.70, "tech": 0.65, "culinary": 0.60
        },
        UserMood.CALM: {
            "wellness": 0.95, "creative": 0.85, "culinary": 0.80,
            "music": 0.75, "photography": 0.70, "design": 0.65
        },
        UserMood.CREATIVE: {
            "creative": 0.95, "design": 0.90, "music": 0.85,
            "photography": 0.85, "culinary": 0.75, "tech": 0.65
        },
        UserMood.FOCUSED: {
            "tech": 0.95, "business": 0.90, "design": 0.85,
            "creative": 0.80, "music": 0.70, "culinary": 0.65
        },
        UserMood.MOTIVATED: {
            "business": 0.95, "tech": 0.90, "sports": 0.85,
            "creative": 0.80, "design": 0.75, "music": 0.65
        },
        UserMood.RELAXED: {
            "wellness": 0.95, "music": 0.90, "creative": 0.85,
            "culinary": 0.80, "photography": 0.75, "design": 0.70
        },
        UserMood.CURIOUS: {
            "tech": 0.95, "design": 0.90, "creative": 0.85,
            "business": 0.80, "culinary": 0.75, "photography": 0.70
        },
        UserMood.INSPIRED: {
            "creative": 0.95, "music": 0.90, "design": 0.85,
            "business": 0.80, "photography": 0.75, "tech": 0.70
        }
    }
    
    # Mood -> Tag affinity mapping
    MOOD_TAG_MAP = {
        UserMood.ENERGETIC: {
            "practical": 0.90, "intensive": 0.85, "advanced": 0.80,
            "challenging": 0.85, "interactive": 0.80, "hands-on": 0.85
        },
        UserMood.CALM: {
            "relaxing": 0.95, "inspiring": 0.85, "beginner": 0.80,
            "gentle": 0.90, "artistic": 0.85, "thoughtful": 0.85
        },
        UserMood.CREATIVE: {
            "artistic": 0.95, "visual": 0.90, "experimental": 0.85,
            "innovative": 0.85, "storytelling": 0.85, "expressive": 0.90
        },
        UserMood.FOCUSED: {
            "structured": 0.95, "practical": 0.90, "advanced": 0.85,
            "technical": 0.90, "comprehensive": 0.85, "systematic": 0.90
        },
        UserMood.MOTIVATED: {
            "challenging": 0.95, "advanced": 0.90, "professional": 0.85,
            "intensive": 0.85, "career-focused": 0.90, "practical": 0.85
        },
        UserMood.RELAXED: {
            "relaxing": 0.95, "inspiring": 0.85, "gentle": 0.90,
            "artistic": 0.85, "beginner": 0.80, "exploratory": 0.80
        },
        UserMood.CURIOUS: {
            "exploratory": 0.95, "innovative": 0.90, "experimental": 0.85,
            "visual": 0.80, "thoughtful": 0.85, "advanced": 0.80
        },
        UserMood.INSPIRED: {
            "inspiring": 0.95, "artistic": 0.90, "creative": 0.85,
            "expressive": 0.90, "storytelling": 0.85, "innovative": 0.80
        }
    }


class ContentSimilarityCalculator:
    """Calculates similarity between courses"""
    
    @staticmethod
    def tag_overlap_similarity(tags1: List[str], tags2: List[str]) -> float:
        """Jaccard similarity between tag sets"""
        set1, set2 = set(tags1), set(tags2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    def category_similarity(cat1: str, cat2: str) -> float:
        """Binary category similarity"""
        return 1.0 if cat1 == cat2 else 0.3
    
    @staticmethod
    def overall_similarity(
        course1: Course,
        course2: Course,
        tag_weight: float = 0.6,
        category_weight: float = 0.4
    ) -> float:
        """Calculate overall similarity between two courses"""
        tag_sim = ContentSimilarityCalculator.tag_overlap_similarity(
            course1.tags, course2.tags
        )
        cat_sim = ContentSimilarityCalculator.category_similarity(
            course1.category, course2.category
        )
        return (tag_sim * tag_weight) + (cat_sim * category_weight)


class UserHistoryAnalyzer:
    """Analyzes user learning history"""
    
    @staticmethod
    def get_preferred_tags(
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> Dict[str, float]:
        """Extract tag preferences from user history"""
        tag_scores = {}
        
        # Weight completed courses higher than enrolled
        for course_id in user_profile.completed_courses:
            if course_id in all_courses:
                course = all_courses[course_id]
                weight = 1.5  # Completed courses have higher weight
                rating = user_profile.course_ratings.get(course_id, 4.0)
                for tag in course.tags:
                    tag_scores[tag] = tag_scores.get(tag, 0) + weight * (rating / 5.0)
        
        for course_id in user_profile.enrolled_courses:
            if course_id not in user_profile.completed_courses:
                if course_id in all_courses:
                    course = all_courses[course_id]
                    weight = 1.0  # Enrolled courses
                    rating = user_profile.course_ratings.get(course_id, 3.0)
                    for tag in course.tags:
                        tag_scores[tag] = tag_scores.get(tag, 0) + weight * (rating / 5.0)
        
        # Normalize scores
        if tag_scores:
            max_score = max(tag_scores.values())
            tag_scores = {tag: score / max_score for tag, score in tag_scores.items()}
        
        return tag_scores
    
    @staticmethod
    def get_preferred_categories(
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> Dict[str, float]:
        """Extract category preferences from user history"""
        category_scores = {}
        
        for course_id in user_profile.completed_courses:
            if course_id in all_courses:
                course = all_courses[course_id]
                weight = 1.5
                rating = user_profile.course_ratings.get(course_id, 4.0)
                category_scores[course.category] = category_scores.get(course.category, 0) + weight * (rating / 5.0)
        
        for course_id in user_profile.enrolled_courses:
            if course_id not in user_profile.completed_courses:
                if course_id in all_courses:
                    course = all_courses[course_id]
                    weight = 1.0
                    rating = user_profile.course_ratings.get(course_id, 3.0)
                    category_scores[course.category] = category_scores.get(course.category, 0) + weight * (rating / 5.0)
        
        # Normalize scores
        if category_scores:
            max_score = max(category_scores.values())
            category_scores = {cat: score / max_score for cat, score in category_scores.items()}
        
        return category_scores
    
    @staticmethod
    def diversity_factor(
        current_courses: List[str],
        all_courses: Dict[str, Course]
    ) -> float:
        """
        Calculate diversity factor - encourage exploring new categories
        Range: [0, 1] where 1 means very diverse learning
        """
        if not current_courses:
            return 1.0
        
        categories = set()
        for course_id in current_courses:
            if course_id in all_courses:
                categories.add(all_courses[course_id].category)
        
        # Higher diversity if fewer categories
        unique_categories = len(categories)
        return max(0.1, 1.0 - (unique_categories / 10.0))


class RecommendationEngine:
    """Main recommendation engine combining all components"""
    
    def __init__(self):
        self.mood_matrix = MoodCourseAffinityMatrix()
        self.similarity_calc = ContentSimilarityCalculator()
        self.history_analyzer = UserHistoryAnalyzer()
    
    def calculate_mood_score(
        self,
        course: Course,
        user_mood: UserMood,
        category_weight: float = 0.5,
        tag_weight: float = 0.5
    ) -> float:
        """Calculate how well a course matches user's current mood"""
        
        # Category affinity
        category_affinity = self.mood_matrix.MOOD_CATEGORY_MAP.get(user_mood, {})
        category_score = category_affinity.get(course.category, 0.3)
        
        # Tag affinity
        tag_affinity = self.mood_matrix.MOOD_TAG_MAP.get(user_mood, {})
        tag_scores = [tag_affinity.get(tag, 0.3) for tag in course.tags]
        tag_score = np.mean(tag_scores) if tag_scores else 0.3
        
        mood_score = (category_score * category_weight) + (tag_score * tag_weight)
        return float(mood_score)
    
    def calculate_personalization_score(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> float:
        """Calculate personalization based on user history"""
        
        # Avoid recommending already enrolled/completed courses
        if course.id in user_profile.enrolled_courses or course.id in user_profile.completed_courses:
            return 0.0
        
        # Get user preferences
        preferred_tags = self.history_analyzer.get_preferred_tags(user_profile, all_courses)
        preferred_categories = self.history_analyzer.get_preferred_categories(user_profile, all_courses)
        
        # Category match
        category_score = preferred_categories.get(course.category, 0.5) if preferred_categories else 0.5
        
        # Tag match
        tag_scores = [preferred_tags.get(tag, 0.5) for tag in course.tags]
        tag_score = np.mean(tag_scores) if tag_scores else 0.5
        
        personalization_score = (category_score + tag_score) / 2.0
        
        return float(personalization_score)
    
    def calculate_content_similarity_score(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        similarity_weight: float = 0.5
    ) -> float:
        """Calculate similarity to user's previous courses"""
        
        if not user_profile.completed_courses and not user_profile.enrolled_courses:
            return 0.5  # Neutral score if no history
        
        # Compare with completed courses (higher weight)
        completed_similarities = []
        for completed_id in user_profile.completed_courses:
            if completed_id in all_courses:
                sim = self.similarity_calc.overall_similarity(
                    course, all_courses[completed_id]
                )
                completed_similarities.append(sim)
        
        # Compare with enrolled courses (lower weight)
        enrolled_similarities = []
        for enrolled_id in user_profile.enrolled_courses:
            if enrolled_id not in user_profile.completed_courses:
                if enrolled_id in all_courses:
                    sim = self.similarity_calc.overall_similarity(
                        course, all_courses[enrolled_id]
                    )
                    enrolled_similarities.append(sim)
        
        avg_completed = np.mean(completed_similarities) if completed_similarities else 0.5
        avg_enrolled = np.mean(enrolled_similarities) if enrolled_similarities else 0.5
        
        # Weight completed courses more heavily
        content_score = (avg_completed * 0.6) + (avg_enrolled * 0.4) if (completed_similarities or enrolled_similarities) else 0.5
        
        return float(content_score)
    
    def calculate_popularity_score(self, course: Course) -> float:
        """Calculate normalized popularity score based on students and rating"""
        
        # Normalize student count (0-100k baseline)
        student_score = min(course.students / 100000.0, 1.0)
        
        # Normalize rating (0-5 scale)
        rating_score = course.rating / 5.0
        
        # Combined popularity
        popularity_score = (student_score * 0.4) + (rating_score * 0.6)
        
        return float(popularity_score)
    
    def calculate_final_score(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        mood_weight: float = 0.40,
        personalization_weight: float = 0.30,
        similarity_weight: float = 0.15,
        popularity_weight: float = 0.15
    ) -> float:
        """Calculate final recommendation score"""
        
        mood_score = self.calculate_mood_score(course, user_profile.current_mood)
        personalization_score = self.calculate_personalization_score(course, user_profile, all_courses)
        similarity_score = self.calculate_content_similarity_score(course, user_profile, all_courses)
        popularity_score = self.calculate_popularity_score(course)
        
        final_score = (
            (mood_score * mood_weight) +
            (personalization_score * personalization_weight) +
            (similarity_score * similarity_weight) +
            (popularity_score * popularity_weight)
        )
        
        return float(final_score)
    
    def get_recommendations(
        self,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        num_recommendations: int = 5,
        mood_weight: float = 0.40,
        personalization_weight: float = 0.30,
        similarity_weight: float = 0.15,
        popularity_weight: float = 0.15
    ) -> List[Tuple[Course, float, Dict[str, float]]]:
        """
        Get top N course recommendations with detailed scoring breakdown
        
        Returns:
            List of (Course, final_score, score_breakdown) tuples
        """
        
        recommendations = []
        
        for course_id, course in all_courses.items():
            # Skip if already enrolled or completed
            if course_id in user_profile.enrolled_courses or course_id in user_profile.completed_courses:
                continue
            
            # Calculate individual scores
            mood_score = self.calculate_mood_score(course, user_profile.current_mood)
            personalization_score = self.calculate_personalization_score(course, user_profile, all_courses)
            similarity_score = self.calculate_content_similarity_score(course, user_profile, all_courses)
            popularity_score = self.calculate_popularity_score(course)
            
            # Calculate final score
            final_score = (
                (mood_score * mood_weight) +
                (personalization_score * personalization_weight) +
                (similarity_score * similarity_weight) +
                (popularity_score * popularity_weight)
            )
            
            # Store breakdown
            score_breakdown = {
                "mood_score": float(mood_score),
                "personalization_score": float(personalization_score),
                "similarity_score": float(similarity_score),
                "popularity_score": float(popularity_score),
                "final_score": float(final_score)
            }
            
            recommendations.append((course, final_score, score_breakdown))
        
        # Sort by final score (descending)
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        # Return top N
        return recommendations[:num_recommendations]
    
    def get_recommendations_by_mood(
        self,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        target_mood: Optional[UserMood] = None,
        num_recommendations: int = 5
    ) -> List[Tuple[Course, float, Dict]]:
        """Get recommendations optimized for a specific mood"""
        
        # Use target mood or current mood
        mood = target_mood or user_profile.current_mood
        
        # Increase mood weight for mood-specific recommendations
        return self.get_recommendations(
            UserProfile(
                user_id=user_profile.user_id,
                current_mood=mood,
                enrolled_courses=user_profile.enrolled_courses,
                completed_courses=user_profile.completed_courses,
                course_ratings=user_profile.course_ratings,
                interaction_history=user_profile.interaction_history
            ),
            all_courses,
            num_recommendations,
            mood_weight=0.55,
            personalization_weight=0.20,
            similarity_weight=0.15,
            popularity_weight=0.10
        )


class RecommendationSerializer:
    """Serialize recommendations to JSON for API consumption"""
    
    @staticmethod
    def serialize_recommendations(
        recommendations: List[Tuple[Course, float, Dict]],
        include_breakdown: bool = True
    ) -> List[Dict]:
        """Convert recommendations to JSON-serializable format"""
        
        result = []
        for course, score, breakdown in recommendations:
            rec_dict = {
                "courseId": course.id,
                "title": course.title,
                "category": course.category,
                "instructor": course.instructor,
                "rating": course.rating,
                "studentsCount": course.students,
                "durationMinutes": course.duration_minutes,
                "tags": course.tags,
                "description": course.description,
                "recommendationScore": round(score * 100, 2)  # Percentage
            }
            
            if include_breakdown:
                rec_dict["scoreBreakdown"] = {
                    "moodScore": round(breakdown["mood_score"] * 100, 2),
                    "personalizationScore": round(breakdown["personalization_score"] * 100, 2),
                    "similarityScore": round(breakdown["similarity_score"] * 100, 2),
                    "popularityScore": round(breakdown["popularity_score"] * 100, 2)
                }
            
            result.append(rec_dict)
        
        return result
    
    @staticmethod
    def to_json(
        recommendations: List[Tuple[Course, float, Dict]],
        user_mood: str,
        include_breakdown: bool = True
    ) -> str:
        """Serialize to JSON string"""
        
        serialized = RecommendationSerializer.serialize_recommendations(
            recommendations, include_breakdown
        )
        
        output = {
            "timestamp": datetime.now().isoformat(),
            "userMood": user_mood,
            "recommendationCount": len(serialized),
            "recommendations": serialized
        }
        
        return json.dumps(output, indent=2)


# Example usage and testing
if __name__ == "__main__":
    # Create sample courses
    sample_courses = {
        "1": Course(
            id="1",
            title="Fundamentele Culinare",
            category="culinary",
            tags=["cooking", "culinary", "chef", "food", "practical"],
            rating=4.8,
            students=98200,
            description="Master culinary essentials",
            duration_minutes=252,
            instructor="Gordon Ramsay"
        ),
        "2": Course(
            id="2",
            title="Masterclass Fotografie",
            category="creative",
            tags=["photography", "creative", "artistic", "visual", "inspiring"],
            rating=4.9,
            students=145000,
            description="Learn photography from Annie Leibovitz",
            duration_minutes=225,
            instructor="Annie Leibovitz"
        ),
        "3": Course(
            id="3",
            title="Producție Muzicală",
            category="creative",
            tags=["music", "creative", "production", "tech", "intensive"],
            rating=4.7,
            students=87500,
            description="Electronic music production",
            duration_minutes=330,
            instructor="Deadmau5"
        ),
        "4": Course(
            id="4",
            title="Scriere Creativă",
            category="creative",
            tags=["writing", "creative", "storytelling", "relaxing", "inspiring"],
            rating=4.9,
            students=112000,
            description="Develop your unique voice",
            duration_minutes=195,
            instructor="Margaret Atwood"
        ),
        "5": Course(
            id="5",
            title="Fundamentele Filmării",
            category="creative",
            tags=["film", "creative", "directing", "artistic", "advanced"],
            rating=5.0,
            students=156000,
            description="Learn filmmaking from Scorsese",
            duration_minutes=260,
            instructor="Martin Scorsese"
        ),
        "6": Course(
            id="6",
            title="Strategie Business",
            category="business",
            tags=["business", "strategy", "management", "professional", "advanced"],
            rating=4.6,
            students=203000,
            description="Master business strategy",
            duration_minutes=170,
            instructor="Bob Iger"
        ),
        "7": Course(
            id="7",
            title="Yoga și Wellness",
            category="wellness",
            tags=["yoga", "wellness", "relaxing", "health", "gentle"],
            rating=4.7,
            students=234000,
            description="Find inner peace",
            duration_minutes=45,
            instructor="Yoga Master"
        ),
        "8": Course(
            id="8",
            title="Design UI/UX",
            category="design",
            tags=["design", "ui", "ux", "creative", "technical"],
            rating=4.8,
            students=167000,
            description="Master modern design",
            duration_minutes=280,
            instructor="Design Expert"
        ),
    }
    
    # Create sample user
    user = UserProfile(
        user_id="user_123",
        current_mood=UserMood.CREATIVE,
        enrolled_courses=["1", "2"],
        completed_courses=["1"],
        course_ratings={"1": 4.5, "2": 4.0},
        interaction_history=[]
    )
    
    # Initialize engine
    engine = RecommendationEngine()
    
    # Get recommendations
    recommendations = engine.get_recommendations(
        user,
        sample_courses,
        num_recommendations=5
    )
    
    # Display results
    print("=" * 80)
    print("PERSONALIZED COURSE RECOMMENDATIONS")
    print(f"User Mood: {user.current_mood.value}")
    print("=" * 80)
    
    for idx, (course, score, breakdown) in enumerate(recommendations, 1):
        print(f"\n{idx}. {course.title}")
        print(f"   Instructor: {course.instructor}")
        print(f"   Rating: {'⭐' * int(course.rating)} ({course.rating}/5)")
        print(f"   Students: {course.students:,}")
        print(f"   Category: {course.category.upper()}")
        print(f"   Tags: {', '.join(course.tags)}")
        print(f"   Duration: {course.duration_minutes} minutes")
        print(f"\n   RECOMMENDATION SCORE: {score*100:.1f}%")
        print(f"   - Mood Match: {breakdown['mood_score']*100:.1f}%")
        print(f"   - Personalization: {breakdown['personalization_score']*100:.1f}%")
        print(f"   - Content Similarity: {breakdown['similarity_score']*100:.1f}%")
        print(f"   - Popularity: {breakdown['popularity_score']*100:.1f}%")
    
    # Serialize to JSON
    print("\n" + "=" * 80)
    print("JSON OUTPUT:")
    print("=" * 80)
    json_output = RecommendationSerializer.to_json(recommendations, user.current_mood.value)
    print(json_output)
