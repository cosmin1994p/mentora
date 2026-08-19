"""
Advanced ML-Based Course Recommendation API
Integrates mood-based recommendations with user history and collaborative filtering
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import numpy as np
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from functools import lru_cache
import pickle
import os

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# DATA MODELS
# ============================================================================

class UserMood(str, Enum):
    """User emotional states"""
    ENERGETIC = "energetic"
    CALM = "calm"
    CREATIVE = "creative"
    FOCUSED = "focused"
    MOTIVATED = "motivated"
    RELAXED = "relaxed"
    CURIOUS = "curious"
    INSPIRED = "inspired"
    STRESSED = "stressed"
    CONFUSED = "confused"


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
    difficulty: str = "intermediate"  # beginner, intermediate, advanced
    language: str = "en"
    thumbnail: str = ""
    video_url: str = ""
    created_date: str = ""
    last_updated: str = ""
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class UserProfile:
    """User profile with learning history"""
    user_id: str
    current_mood: UserMood
    enrolled_courses: List[str] = None
    completed_courses: List[str] = None
    course_ratings: Dict[str, float] = None
    watched_minutes: Dict[str, int] = None
    learning_level: str = "beginner"  # beginner, intermediate, advanced
    learning_style: str = "mixed"  # visual, auditory, reading, kinesthetic, mixed
    last_active: str = ""
    interaction_history: List[Dict] = None
    
    def __post_init__(self):
        if self.enrolled_courses is None:
            self.enrolled_courses = []
        if self.completed_courses is None:
            self.completed_courses = []
        if self.course_ratings is None:
            self.course_ratings = {}
        if self.watched_minutes is None:
            self.watched_minutes = {}
        if self.interaction_history is None:
            self.interaction_history = []


# ============================================================================
# MOOD AFFINITY MATRICES - EXTENDED
# ============================================================================

class MoodCourseAffinityMatrix:
    """Extended mood to course affinity mapping"""
    
    MOOD_CATEGORY_MAP = {
        UserMood.ENERGETIC: {
            "sports": 0.95, "business": 0.85, "music": 0.80,
            "creative": 0.70, "tech": 0.65, "culinary": 0.60,
            "wellness": 0.75, "dance": 0.90, "fitness": 0.90
        },
        UserMood.CALM: {
            "wellness": 0.95, "creative": 0.85, "culinary": 0.80,
            "music": 0.75, "photography": 0.70, "design": 0.65,
            "meditation": 0.95, "art": 0.80, "writing": 0.75
        },
        UserMood.CREATIVE: {
            "creative": 0.95, "design": 0.90, "music": 0.85,
            "photography": 0.85, "culinary": 0.75, "tech": 0.65,
            "art": 0.95, "writing": 0.85, "film": 0.90
        },
        UserMood.FOCUSED: {
            "tech": 0.95, "business": 0.90, "design": 0.85,
            "creative": 0.80, "music": 0.70, "culinary": 0.65,
            "programming": 0.95, "math": 0.85, "analytics": 0.90
        },
        UserMood.MOTIVATED: {
            "business": 0.95, "tech": 0.90, "sports": 0.85,
            "creative": 0.80, "design": 0.75, "music": 0.65,
            "career": 0.95, "entrepreneurship": 0.95, "leadership": 0.90
        },
        UserMood.RELAXED: {
            "wellness": 0.95, "music": 0.90, "creative": 0.85,
            "culinary": 0.80, "photography": 0.75, "design": 0.70,
            "meditation": 0.90, "art": 0.85, "gardening": 0.80
        },
        UserMood.CURIOUS: {
            "tech": 0.95, "design": 0.90, "creative": 0.85,
            "business": 0.80, "culinary": 0.75, "photography": 0.70,
            "science": 0.95, "history": 0.85, "philosophy": 0.90
        },
        UserMood.INSPIRED: {
            "creative": 0.95, "music": 0.90, "design": 0.85,
            "business": 0.80, "photography": 0.75, "tech": 0.70,
            "art": 0.95, "film": 0.90, "storytelling": 0.90
        },
        UserMood.STRESSED: {
            "wellness": 0.95, "meditation": 0.95, "yoga": 0.90,
            "music": 0.85, "creative": 0.80, "art": 0.85,
            "nature": 0.80, "cooking": 0.75, "gardening": 0.75
        },
        UserMood.CONFUSED: {
            "tech": 0.85, "business": 0.80, "programming": 0.90,
            "design": 0.75, "writing": 0.75, "creative": 0.70,
            "fundamentals": 0.95, "beginner": 0.95, "basics": 0.95
        }
    }
    
    MOOD_TAG_MAP = {
        UserMood.ENERGETIC: {
            "practical": 0.90, "intensive": 0.85, "advanced": 0.80,
            "challenging": 0.85, "interactive": 0.80, "hands-on": 0.85,
            "fast-paced": 0.95, "action-packed": 0.90, "dynamic": 0.90
        },
        UserMood.CALM: {
            "relaxing": 0.95, "inspiring": 0.85, "beginner": 0.80,
            "gentle": 0.90, "artistic": 0.85, "thoughtful": 0.85,
            "mindful": 0.95, "meditative": 0.90, "peaceful": 0.95
        },
        UserMood.CREATIVE: {
            "artistic": 0.95, "visual": 0.90, "experimental": 0.85,
            "innovative": 0.85, "storytelling": 0.85, "expressive": 0.90,
            "unique": 0.90, "original": 0.90, "imaginative": 0.95
        },
        UserMood.FOCUSED: {
            "structured": 0.95, "practical": 0.90, "advanced": 0.85,
            "technical": 0.90, "comprehensive": 0.85, "systematic": 0.90,
            "detailed": 0.95, "thorough": 0.95, "methodical": 0.95
        },
        UserMood.MOTIVATED: {
            "challenging": 0.95, "advanced": 0.90, "professional": 0.85,
            "intensive": 0.85, "career-focused": 0.90, "practical": 0.85,
            "goal-oriented": 0.95, "success-driven": 0.95, "achievement": 0.95
        },
        UserMood.RELAXED: {
            "relaxing": 0.95, "inspiring": 0.85, "gentle": 0.90,
            "artistic": 0.85, "beginner": 0.80, "exploratory": 0.80,
            "leisurely": 0.90, "easy-going": 0.90, "laid-back": 0.95
        },
        UserMood.CURIOUS: {
            "exploratory": 0.95, "innovative": 0.90, "experimental": 0.85,
            "visual": 0.80, "thoughtful": 0.85, "advanced": 0.80,
            "discovery": 0.95, "research": 0.90, "deep-dive": 0.95
        },
        UserMood.INSPIRED: {
            "inspiring": 0.95, "artistic": 0.90, "creative": 0.85,
            "expressive": 0.90, "storytelling": 0.85, "innovative": 0.80,
            "motivational": 0.95, "uplifting": 0.95, "transformative": 0.95
        },
        UserMood.STRESSED: {
            "beginner": 0.90, "gentle": 0.95, "relaxing": 0.95,
            "simple": 0.90, "clear": 0.90, "supportive": 0.95,
            "reassuring": 0.95, "step-by-step": 0.95, "easy": 0.90
        },
        UserMood.CONFUSED: {
            "beginner": 0.95, "fundamentals": 0.95, "basics": 0.95,
            "clear": 0.95, "structured": 0.90, "practical": 0.85,
            "step-by-step": 0.95, "comprehensive": 0.90, "thorough": 0.90
        }
    }
    
    # Difficulty level preferences by mood
    MOOD_DIFFICULTY_PREFERENCE = {
        UserMood.ENERGETIC: {"advanced": 0.9, "intermediate": 0.8, "beginner": 0.4},
        UserMood.CALM: {"beginner": 0.9, "intermediate": 0.8, "advanced": 0.5},
        UserMood.CREATIVE: {"intermediate": 0.9, "advanced": 0.85, "beginner": 0.6},
        UserMood.FOCUSED: {"advanced": 0.95, "intermediate": 0.85, "beginner": 0.3},
        UserMood.MOTIVATED: {"advanced": 0.95, "intermediate": 0.8, "beginner": 0.4},
        UserMood.RELAXED: {"beginner": 0.85, "intermediate": 0.8, "advanced": 0.5},
        UserMood.CURIOUS: {"advanced": 0.9, "intermediate": 0.85, "beginner": 0.7},
        UserMood.INSPIRED: {"intermediate": 0.85, "advanced": 0.9, "beginner": 0.6},
        UserMood.STRESSED: {"beginner": 0.95, "intermediate": 0.7, "advanced": 0.2},
        UserMood.CONFUSED: {"beginner": 0.95, "intermediate": 0.8, "advanced": 0.2}
    }


# ============================================================================
# CONTENT SIMILARITY & ANALYSIS
# ============================================================================

class ContentSimilarityCalculator:
    """Advanced content similarity calculations"""
    
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
        """Category similarity with bonus for same category"""
        return 1.0 if cat1.lower() == cat2.lower() else 0.3
    
    @staticmethod
    def difficulty_progression(diff1: str, diff2: str) -> float:
        """Encourage natural difficulty progression"""
        progression_order = ["beginner", "intermediate", "advanced"]
        try:
            idx1 = progression_order.index(diff1.lower())
            idx2 = progression_order.index(diff2.lower())
            
            # If second course is harder, give higher score
            if idx2 > idx1:
                return 0.9  # Good progression
            elif idx2 == idx1:
                return 0.8  # Same level
            else:
                return 0.5  # Going backwards
        except ValueError:
            return 0.7
    
    @staticmethod
    def overall_similarity(
        course1: Course,
        course2: Course,
        tag_weight: float = 0.5,
        category_weight: float = 0.3,
        difficulty_weight: float = 0.2
    ) -> float:
        """Calculate overall similarity between courses"""
        tag_sim = ContentSimilarityCalculator.tag_overlap_similarity(
            course1.tags, course2.tags
        )
        cat_sim = ContentSimilarityCalculator.category_similarity(
            course1.category, course2.category
        )
        diff_sim = ContentSimilarityCalculator.difficulty_progression(
            course1.difficulty, course2.difficulty
        )
        
        return (tag_sim * tag_weight) + (cat_sim * category_weight) + (diff_sim * difficulty_weight)


class UserHistoryAnalyzer:
    """Advanced user history analysis"""
    
    @staticmethod
    def get_preferred_tags(
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> Dict[str, float]:
        """Extract and weight preferred tags from user history"""
        tag_scores = {}
        
        # Weight by completion and rating
        for course_id in user_profile.completed_courses:
            if course_id in all_courses:
                course = all_courses[course_id]
                # Completed courses have higher weight
                weight = 2.0
                rating = user_profile.course_ratings.get(course_id, 4.0)
                watched_pct = user_profile.watched_minutes.get(course_id, 0) / max(course.duration_minutes, 1)
                
                for tag in course.tags:
                    score = weight * (rating / 5.0) * (0.5 + watched_pct * 0.5)
                    tag_scores[tag] = tag_scores.get(tag, 0) + score
        
        # Enrolled courses (active learning)
        for course_id in user_profile.enrolled_courses:
            if course_id not in user_profile.completed_courses and course_id in all_courses:
                course = all_courses[course_id]
                weight = 1.5
                rating = user_profile.course_ratings.get(course_id, 3.0)
                watched_pct = user_profile.watched_minutes.get(course_id, 0) / max(course.duration_minutes, 1)
                
                for tag in course.tags:
                    score = weight * (rating / 5.0) * (0.3 + watched_pct * 0.7)
                    tag_scores[tag] = tag_scores.get(tag, 0) + score
        
        # Normalize
        if tag_scores:
            max_score = max(tag_scores.values())
            tag_scores = {tag: min(score / max_score, 1.0) for tag, score in tag_scores.items()}
        
        return tag_scores
    
    @staticmethod
    def get_preferred_categories(
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> Dict[str, float]:
        """Extract preferred categories"""
        cat_scores = {}
        
        for course_id in user_profile.completed_courses:
            if course_id in all_courses:
                course = all_courses[course_id]
                weight = 2.0
                rating = user_profile.course_ratings.get(course_id, 4.0)
                cat_scores[course.category] = cat_scores.get(course.category, 0) + weight * (rating / 5.0)
        
        for course_id in user_profile.enrolled_courses:
            if course_id not in user_profile.completed_courses and course_id in all_courses:
                course = all_courses[course_id]
                weight = 1.5
                rating = user_profile.course_ratings.get(course_id, 3.0)
                cat_scores[course.category] = cat_scores.get(course.category, 0) + weight * (rating / 5.0)
        
        # Normalize
        if cat_scores:
            max_score = max(cat_scores.values())
            cat_scores = {cat: min(score / max_score, 1.0) for cat, score in cat_scores.items()}
        
        return cat_scores
    
    @staticmethod
    def calculate_diversity_score(
        current_courses: List[str],
        all_courses: Dict[str, Course]
    ) -> float:
        """Calculate exploration bonus for diverse learning"""
        if not current_courses:
            return 1.0
        
        categories = set()
        for course_id in current_courses:
            if course_id in all_courses:
                categories.add(all_courses[course_id].category)
        
        # Encourage diversity in category exploration
        unique_categories = len(categories)
        return max(0.2, 1.0 - (unique_categories / 15.0))
    
    @staticmethod
    def get_user_skill_level(
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> str:
        """Infer user skill level from completed courses"""
        if not user_profile.completed_courses:
            return "beginner"
        
        avg_difficulty = 0
        for course_id in user_profile.completed_courses:
            if course_id in all_courses:
                course = all_courses[course_id]
                difficulty_map = {"beginner": 1, "intermediate": 2, "advanced": 3}
                avg_difficulty += difficulty_map.get(course.difficulty.lower(), 2)
        
        avg_difficulty /= len(user_profile.completed_courses)
        
        if avg_difficulty < 1.5:
            return "beginner"
        elif avg_difficulty < 2.5:
            return "intermediate"
        else:
            return "advanced"


# ============================================================================
# MAIN RECOMMENDATION ENGINE
# ============================================================================

class AdvancedRecommendationEngine:
    """Advanced ML-based recommendation engine"""
    
    def __init__(self):
        self.mood_matrix = MoodCourseAffinityMatrix()
        self.similarity_calc = ContentSimilarityCalculator()
        self.history_analyzer = UserHistoryAnalyzer()
        self.cache = {}
    
    def calculate_mood_score(
        self,
        course: Course,
        user_mood: UserMood,
        category_weight: float = 0.4,
        tag_weight: float = 0.4,
        difficulty_weight: float = 0.2
    ) -> float:
        """Calculate mood compatibility score"""
        
        # Category affinity
        category_affinity = self.mood_matrix.MOOD_CATEGORY_MAP.get(user_mood, {})
        category_score = category_affinity.get(course.category.lower(), 0.3)
        
        # Tag affinity
        tag_affinity = self.mood_matrix.MOOD_TAG_MAP.get(user_mood, {})
        tag_scores = [tag_affinity.get(tag.lower(), 0.3) for tag in course.tags]
        tag_score = np.mean(tag_scores) if tag_scores else 0.3
        
        # Difficulty preference
        difficulty_prefs = self.mood_matrix.MOOD_DIFFICULTY_PREFERENCE.get(user_mood, {})
        difficulty_score = difficulty_prefs.get(course.difficulty.lower(), 0.5)
        
        mood_score = (category_score * category_weight) + (tag_score * tag_weight) + (difficulty_score * difficulty_weight)
        return float(np.clip(mood_score, 0, 1))
    
    def calculate_personalization_score(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> float:
        """Calculate personalization based on user history"""
        
        # Avoid already enrolled courses
        if course.id in user_profile.enrolled_courses or course.id in user_profile.completed_courses:
            return 0.0
        
        # Get preferences
        preferred_tags = self.history_analyzer.get_preferred_tags(user_profile, all_courses)
        preferred_cats = self.history_analyzer.get_preferred_categories(user_profile, all_courses)
        
        # Category match
        cat_score = preferred_cats.get(course.category.lower(), 0.5) if preferred_cats else 0.5
        
        # Tag match
        tag_scores = [preferred_tags.get(tag.lower(), 0.5) for tag in course.tags]
        tag_score = np.mean(tag_scores) if tag_scores else 0.5
        
        personalization_score = (cat_score * 0.5) + (tag_score * 0.5)
        
        return float(np.clip(personalization_score, 0, 1))
    
    def calculate_similarity_score(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> float:
        """Calculate similarity to previous courses"""
        
        if not user_profile.completed_courses and not user_profile.enrolled_courses:
            return 0.5
        
        # Completed courses (higher weight)
        completed_similarities = []
        for completed_id in user_profile.completed_courses:
            if completed_id in all_courses:
                sim = self.similarity_calc.overall_similarity(course, all_courses[completed_id])
                completed_similarities.append(sim)
        
        # Enrolled courses (lower weight)
        enrolled_similarities = []
        for enrolled_id in user_profile.enrolled_courses:
            if enrolled_id not in user_profile.completed_courses and enrolled_id in all_courses:
                sim = self.similarity_calc.overall_similarity(course, all_courses[enrolled_id])
                enrolled_similarities.append(sim)
        
        avg_completed = np.mean(completed_similarities) if completed_similarities else 0.5
        avg_enrolled = np.mean(enrolled_similarities) if enrolled_similarities else 0.5
        
        similarity_score = (avg_completed * 0.6) + (avg_enrolled * 0.4) if (completed_similarities or enrolled_similarities) else 0.5
        
        return float(np.clip(similarity_score, 0, 1))
    
    def calculate_diversity_bonus(
        self,
        course: Course,
        user_profile: UserProfile,
        all_courses: Dict[str, Course]
    ) -> float:
        """Calculate bonus for exploring new categories"""
        
        all_course_cats = {c.category for c in all_courses.values()}
        user_cats = {all_courses[cid].category for cid in (user_profile.enrolled_courses + user_profile.completed_courses) if cid in all_courses}
        
        # If course is in a new category, give bonus
        if course.category not in user_cats:
            return 0.2  # 20% bonus
        
        return 0.0
    
    def calculate_popularity_score(self, course: Course) -> float:
        """Calculate normalized popularity"""
        
        # Normalize student count
        student_score = min(course.students / 100000.0, 1.0)
        
        # Normalize rating
        rating_score = course.rating / 5.0
        
        popularity_score = (student_score * 0.4) + (rating_score * 0.6)
        
        return float(np.clip(popularity_score, 0, 1))
    
    def calculate_recency_bonus(self, course: Course) -> float:
        """Give slight bonus to recently updated courses"""
        if not course.last_updated:
            return 0.0
        
        try:
            updated_date = datetime.fromisoformat(course.last_updated)
            days_since_update = (datetime.now() - updated_date).days
            
            # If updated in last 30 days, give bonus
            if days_since_update <= 30:
                return 0.1 * (1 - days_since_update / 30.0)
        except:
            pass
        
        return 0.0
    
    def get_recommendations(
        self,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        num_recommendations: int = 5,
        mood_weight: float = 0.35,
        personalization_weight: float = 0.25,
        similarity_weight: float = 0.15,
        popularity_weight: float = 0.15,
        diversity_weight: float = 0.05,
        recency_weight: float = 0.05
    ) -> List[Tuple[Course, float, Dict[str, float]]]:
        """
        Get top N course recommendations with detailed scoring breakdown
        
        Args:
            user_profile: User profile with mood and history
            all_courses: Dictionary of available courses
            num_recommendations: Number of recommendations to return
            mood_weight: Weight for mood matching (0-1)
            personalization_weight: Weight for user history (0-1)
            similarity_weight: Weight for content similarity (0-1)
            popularity_weight: Weight for course popularity (0-1)
            diversity_weight: Weight for category exploration (0-1)
            recency_weight: Weight for recent updates (0-1)
        
        Returns:
            List of (Course, final_score, breakdown) tuples
        """
        
        recommendations = []
        
        for course_id, course in all_courses.items():
            # Skip if already enrolled
            if course_id in user_profile.enrolled_courses or course_id in user_profile.completed_courses:
                continue
            
            # Calculate component scores
            mood_score = self.calculate_mood_score(course, user_profile.current_mood)
            personalization_score = self.calculate_personalization_score(course, user_profile, all_courses)
            similarity_score = self.calculate_similarity_score(course, user_profile, all_courses)
            popularity_score = self.calculate_popularity_score(course)
            diversity_bonus = self.calculate_diversity_bonus(course, user_profile, all_courses)
            recency_bonus = self.calculate_recency_bonus(course)
            
            # Calculate final score
            final_score = (
                (mood_score * mood_weight) +
                (personalization_score * personalization_weight) +
                (similarity_score * similarity_weight) +
                (popularity_score * popularity_weight) +
                (diversity_bonus * diversity_weight) +
                (recency_bonus * recency_weight)
            )
            
            # Store with breakdown
            breakdown = {
                "mood_score": float(mood_score),
                "personalization_score": float(personalization_score),
                "similarity_score": float(similarity_score),
                "popularity_score": float(popularity_score),
                "diversity_bonus": float(diversity_bonus),
                "recency_bonus": float(recency_bonus)
            }
            
            recommendations.append((course, float(final_score), breakdown))
        
        # Sort by final score
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        return recommendations[:num_recommendations]
    
    def get_mood_specific_recommendations(
        self,
        user_profile: UserProfile,
        all_courses: Dict[str, Course],
        target_mood: Optional[UserMood] = None,
        num_recommendations: int = 5
    ) -> List[Tuple[Course, float, Dict[str, float]]]:
        """Get recommendations for a specific mood"""
        
        mood = target_mood or user_profile.current_mood
        
        # Adjust weights to emphasize mood
        return self.get_recommendations(
            UserProfile(
                user_id=user_profile.user_id,
                current_mood=mood,
                enrolled_courses=user_profile.enrolled_courses,
                completed_courses=user_profile.completed_courses,
                course_ratings=user_profile.course_ratings,
                watched_minutes=user_profile.watched_minutes,
                learning_level=user_profile.learning_level,
                learning_style=user_profile.learning_style,
                interaction_history=user_profile.interaction_history
            ),
            all_courses,
            num_recommendations,
            mood_weight=0.50,
            personalization_weight=0.15,
            similarity_weight=0.15,
            popularity_weight=0.12,
            diversity_weight=0.05,
            recency_weight=0.03
        )


# ============================================================================
# SERIALIZATION & API RESPONSE
# ============================================================================

class RecommendationSerializer:
    """Serialize recommendations to API format"""
    
    @staticmethod
    def serialize(
        recommendations: List[Tuple[Course, float, Dict]],
        include_breakdown: bool = True
    ) -> List[Dict]:
        """Convert recommendations to JSON-serializable format"""
        
        result = []
        for idx, (course, score, breakdown) in enumerate(recommendations, 1):
            rec_dict = {
                "rank": idx,
                "courseId": course.id,
                "title": course.title,
                "category": course.category,
                "instructor": course.instructor,
                "rating": round(course.rating, 1),
                "studentsCount": course.students,
                "durationMinutes": course.duration_minutes,
                "difficulty": course.difficulty,
                "tags": course.tags,
                "description": course.description,
                "recommendationScore": round(score * 100, 2),
                "scorePercentage": round(score * 100, 2)
            }
            
            if include_breakdown:
                rec_dict["scoreBreakdown"] = {
                    "moodScore": round(breakdown.get("mood_score", 0) * 100, 2),
                    "personalizationScore": round(breakdown.get("personalization_score", 0) * 100, 2),
                    "similarityScore": round(breakdown.get("similarity_score", 0) * 100, 2),
                    "popularityScore": round(breakdown.get("popularity_score", 0) * 100, 2),
                    "diversityBonus": round(breakdown.get("diversity_bonus", 0) * 100, 2),
                    "recencyBonus": round(breakdown.get("recency_bonus", 0) * 100, 2)
                }
            
            result.append(rec_dict)
        
        return result
    
    @staticmethod
    def to_json(
        recommendations: List[Tuple[Course, float, Dict]],
        user_mood: str,
        user_id: str = "",
        include_breakdown: bool = True
    ) -> str:
        """Serialize to JSON"""
        
        serialized = RecommendationSerializer.serialize(recommendations, include_breakdown)
        
        output = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "userId": user_id,
            "userMood": user_mood,
            "recommendationCount": len(serialized),
            "recommendations": serialized
        }
        
        return json.dumps(output, indent=2)


# ============================================================================
# FLASK API APPLICATION
# ============================================================================

def create_app():
    """Create and configure Flask application"""
    
    app = Flask(__name__)
    CORS(app)
    
    # Initialize recommendation engine
    engine = AdvancedRecommendationEngine()
    
    # In-memory course database (replace with MongoDB for production)
    app.courses_db = {}
    app.users_db = {}
    
    # ========================================================================
    # ROUTES
    # ========================================================================
    
    @app.route('/api/health', methods=['GET'])
    def health():
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "ML Recommendation Engine"
        })
    
    @app.route('/api/recommendations', methods=['POST'])
    def get_recommendations():
        """
        Get personalized course recommendations
        
        Request JSON:
        {
            "userId": "user_123",
            "currentMood": "creative",
            "enrolledCourses": ["1", "2"],
            "completedCourses": ["1"],
            "courseRatings": {"1": 4.5, "2": 4.0},
            "num_recommendations": 5
        }
        """
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ["userId", "currentMood"]
            for field in required_fields:
                if field not in data:
                    return jsonify({"error": f"Missing required field: {field}"}), 400
            
            user_id = data["userId"]
            mood_str = data["currentMood"].lower()
            num_recs = data.get("num_recommendations", 5)
            
            # Validate mood
            try:
                current_mood = UserMood[mood_str.upper()]
            except KeyError:
                return jsonify({"error": f"Invalid mood: {mood_str}"}), 400
            
            # Create user profile
            user_profile = UserProfile(
                user_id=user_id,
                current_mood=current_mood,
                enrolled_courses=data.get("enrolledCourses", []),
                completed_courses=data.get("completedCourses", []),
                course_ratings=data.get("courseRatings", {}),
                watched_minutes=data.get("watchedMinutes", {}),
                learning_level=data.get("learningLevel", "beginner"),
                learning_style=data.get("learningStyle", "mixed")
            )
            
            # Get recommendations
            recommendations = engine.get_recommendations(
                user_profile,
                app.courses_db,
                num_recommendations=min(num_recs, 20)
            )
            
            # Serialize and return
            json_response = RecommendationSerializer.to_json(
                recommendations,
                current_mood.value,
                user_id
            )
            
            return jsonify(json.loads(json_response))
        
        except Exception as e:
            logger.error(f"Error in recommendations endpoint: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/recommendations/by-mood', methods=['POST'])
    def get_mood_specific_recommendations():
        """Get recommendations for a specific mood"""
        try:
            data = request.get_json()
            
            user_id = data.get("userId", "")
            mood_str = data.get("targetMood", "creative").lower()
            num_recs = data.get("num_recommendations", 5)
            
            try:
                target_mood = UserMood[mood_str.upper()]
            except KeyError:
                return jsonify({"error": f"Invalid mood: {mood_str}"}), 400
            
            user_profile = UserProfile(
                user_id=user_id,
                current_mood=target_mood,
                enrolled_courses=data.get("enrolledCourses", []),
                completed_courses=data.get("completedCourses", []),
                course_ratings=data.get("courseRatings", {})
            )
            
            recommendations = engine.get_mood_specific_recommendations(
                user_profile,
                app.courses_db,
                target_mood=target_mood,
                num_recommendations=min(num_recs, 20)
            )
            
            json_response = RecommendationSerializer.to_json(
                recommendations,
                target_mood.value,
                user_id
            )
            
            return jsonify(json.loads(json_response))
        
        except Exception as e:
            logger.error(f"Error in mood-specific recommendations: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/courses', methods=['POST'])
    def add_course():
        """Add a course to the database"""
        try:
            data = request.get_json()
            course = Course(**data)
            app.courses_db[course.id] = course
            
            return jsonify({
                "success": True,
                "message": "Course added successfully",
                "course_id": course.id
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    
    @app.route('/api/courses', methods=['GET'])
    def list_courses():
        """List all courses"""
        courses = [c.to_dict() for c in app.courses_db.values()]
        return jsonify({
            "success": True,
            "count": len(courses),
            "courses": courses
        })
    
    @app.route('/api/moods', methods=['GET'])
    def list_moods():
        """List available moods"""
        moods = [m.value for m in UserMood]
        return jsonify({
            "success": True,
            "moods": moods
        })
    
    return app


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == '__main__':
    app = create_app()
    
    # For development only
    print("ML Recommendation Engine API starting...")
    print("Available endpoints:")
    print("  POST /api/recommendations - Get personalized recommendations")
    print("  POST /api/recommendations/by-mood - Get mood-specific recommendations")
    print("  GET /api/moods - List available moods")
    print("  GET /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
