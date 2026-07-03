"""
Emotion-Based Deep Learning Course Recommendation Engine
=========================================================
Uses neural networks to provide personalized course recommendations based on:
- User's current emotional state (selected at login)
- Past course enrollments and completions
- Course tags/labels and categories
- User interaction history

Author: StreamClass ML Team
Version: 2.0.0
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json
from datetime import datetime
import logging
import os
import pickle
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing TensorFlow/Keras - fallback to numpy-based implementation
# Note: Set USE_TENSORFLOW=False to use rule-based model (faster, no TF dependency)
USE_TENSORFLOW = os.environ.get('USE_TENSORFLOW', 'false').lower() == 'true'

TF_AVAILABLE = False
if USE_TENSORFLOW:
    try:
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers
        from tensorflow.keras.models import Model
        from tensorflow.keras.callbacks import EarlyStopping
        TF_AVAILABLE = True
        logger.info("TensorFlow available - using deep learning model")
    except ImportError as e:
        TF_AVAILABLE = False
        logger.warning(f"TensorFlow not available ({e}) - using rule-based model")
else:
    logger.info("Using rule-based recommendation model (TensorFlow disabled)")

# Try importing sklearn for preprocessing
try:
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("Sklearn not available - using basic preprocessing")


# =============================================================================
# DATA STRUCTURES
# =============================================================================

class Emotion(Enum):
    """User emotional states - matches MoodModal.tsx"""
    FERICIT = "felicit"      # Happy
    MOTIVAT = "motivat"      # Motivated
    RELAXAT = "relaxat"      # Relaxed
    CURIOS = "curios"        # Curious
    PRODUCTIV = "productiv"  # Productive
    CREATIV = "creativ"      # Creative


class EnergyLevel(Enum):
    """User energy levels - matches MoodModal.tsx"""
    RIDICATA = "ridicata"    # High
    MEDIE = "medie"          # Medium
    SCAZUTA = "scazuta"      # Low


@dataclass
class CourseData:
    """Course data structure"""
    id: str
    title: str
    category: str
    tags: List[str]
    rating: float
    students: int
    description: str
    duration: str
    instructor: str
    enrolled: bool = False
    progress: float = 0.0
    created_at: Optional[Any] = None


@dataclass
class UserState:
    """User state including emotion, history, and profile data"""
    user_id: str
    current_emotion: Emotion
    energy_level: EnergyLevel
    activity_domain: str = ""  # User's professional domain
    interests: List[str] = field(default_factory=list)  # User's selected interests
    enrolled_courses: List[str] = field(default_factory=list)
    completed_courses: List[str] = field(default_factory=list)
    course_ratings: Dict[str, float] = field(default_factory=dict)
    interaction_history: List[Dict] = field(default_factory=list)
    preferred_tags: List[str] = field(default_factory=list)
    preferred_categories: List[str] = field(default_factory=list)


# =============================================================================
# EMOTION-TAG AFFINITY MATRIX
# =============================================================================

class EmotionTagAffinity:
    """
    Maps emotions to course characteristics with learned weights.
    Initial weights are hand-crafted, but can be updated through training.
    """
    
    # Emotion -> Tag affinity mapping (higher = better match)
    EMOTION_TAG_AFFINITY = {
        Emotion.FERICIT: {
            "inspiring": 0.95, "creative": 0.90, "motivational": 0.90,
            "success": 0.85, "achievement": 0.85, "art": 0.80,
            "music": 0.80, "artistic": 0.75, "design": 0.75,
            "learning": 0.70, "beginner": 0.65
        },
        Emotion.MOTIVAT: {
            "achievement": 0.95, "leadership": 0.95, "business": 0.90,
            "goals": 0.90, "success": 0.90, "intensive": 0.85,
            "advanced": 0.85, "professional": 0.80, "strategy": 0.80,
            "challenging": 0.75, "productivity": 0.75
        },
        Emotion.RELAXAT: {
            "creative": 0.95, "artistic": 0.90, "photography": 0.85,
            "music": 0.85, "relaxing": 0.90, "balanced": 0.85,
            "easy": 0.80, "beginner": 0.75, "art": 0.80,
            "design": 0.75, "wellness": 0.85
        },
        Emotion.CURIOS: {
            "learning": 0.95, "tech": 0.95, "science": 0.90,
            "innovation": 0.90, "challenging": 0.85, "advanced": 0.85,
            "programming": 0.85, "exploration": 0.80, "research": 0.80,
            "experimental": 0.75, "analytical": 0.75
        },
        Emotion.PRODUCTIV: {
            "business": 0.95, "productivity": 0.95, "strategy": 0.90,
            "efficiency": 0.90, "practical": 0.90, "fundamental": 0.85,
            "professional": 0.85, "time-management": 0.85, "goals": 0.80,
            "advanced": 0.75, "challenging": 0.75
        },
        Emotion.CREATIV: {
            "art": 0.95, "design": 0.95, "creative": 0.95,
            "artistic": 0.90, "writing": 0.90, "music": 0.85,
            "photography": 0.85, "visual": 0.85, "innovative": 0.80,
            "experimental": 0.80, "storytelling": 0.75
        }
    }
    
    # Emotion -> Category affinity mapping
    EMOTION_CATEGORY_AFFINITY = {
        Emotion.FERICIT: {
            "creative": 0.90, "music": 0.85, "featured": 0.80,
            "wellness": 0.75, "business": 0.70
        },
        Emotion.MOTIVAT: {
            "business": 0.95, "tech": 0.85, "featured": 0.80,
            "creative": 0.70, "wellness": 0.65
        },
        Emotion.RELAXAT: {
            "creative": 0.90, "featured": 0.85, "wellness": 0.85,
            "music": 0.80, "photography": 0.75
        },
        Emotion.CURIOS: {
            "tech": 0.95, "business": 0.80, "creative": 0.75,
            "featured": 0.75, "science": 0.90
        },
        Emotion.PRODUCTIV: {
            "business": 0.95, "tech": 0.90, "featured": 0.75,
            "creative": 0.70, "professional": 0.85
        },
        Emotion.CREATIV: {
            "creative": 0.95, "music": 0.90, "featured": 0.80,
            "design": 0.90, "photography": 0.85
        }
    }
    
    # Energy level modifiers
    ENERGY_MODIFIERS = {
        EnergyLevel.RIDICATA: {
            "intensive": 1.3, "challenging": 1.25, "advanced": 1.2,
            "energizing": 1.3, "workout": 1.25, "achievement": 1.2,
            "easy": 0.7, "relaxing": 0.6, "beginner": 0.8
        },
        EnergyLevel.MEDIE: {
            "balanced": 1.2, "practical": 1.15, "moderate": 1.15,
            "learning": 1.1, "fundamental": 1.1
        },
        EnergyLevel.SCAZUTA: {
            "relaxing": 1.3, "easy": 1.25, "beginner": 1.2,
            "gentle": 1.25, "calm": 1.2, "inspiring": 1.1,
            "intensive": 0.6, "challenging": 0.7, "advanced": 0.75
        }
    }
    
    # Activity Domain -> Category affinity mapping
    # Maps user's professional domain to preferred course categories
    ACTIVITY_DOMAIN_CATEGORY_AFFINITY = {
        "Technology": {
            "tech": 0.95, "programming": 0.90, "business": 0.75,
            "creative": 0.60, "featured": 0.70
        },
        "Education": {
            "tech": 0.85, "business": 0.80, "creative": 0.75,
            "featured": 0.80, "wellness": 0.70
        },
        "Finance": {
            "business": 0.95, "tech": 0.80, "featured": 0.75,
            "creative": 0.55, "strategy": 0.90
        },
        "Healthcare": {
            "wellness": 0.95, "health": 0.95, "tech": 0.70,
            "business": 0.65, "featured": 0.75
        },
        "Retail": {
            "business": 0.90, "marketing": 0.85, "creative": 0.75,
            "tech": 0.70, "featured": 0.75
        },
        "Manufacturing": {
            "tech": 0.85, "business": 0.85, "featured": 0.70,
            "creative": 0.60, "strategy": 0.80
        },
        "Entertainment": {
            "creative": 0.95, "music": 0.90, "featured": 0.85,
            "tech": 0.70, "business": 0.65
        },
        "Consulting": {
            "business": 0.95, "strategy": 0.90, "tech": 0.80,
            "featured": 0.75, "creative": 0.65
        },
        "Startup": {
            "business": 0.95, "tech": 0.90, "creative": 0.80,
            "featured": 0.80, "strategy": 0.85
        },
        "Other": {
            "featured": 0.80, "business": 0.75, "tech": 0.75,
            "creative": 0.75, "wellness": 0.70
        }
    }
    
    # Interest -> Tag mapping
    # Maps user's selected interests to course tags
    INTEREST_TAG_MAPPING = {
        "Technology": ["tech", "programming", "innovation", "science", "analytical"],
        "Design": ["design", "creative", "artistic", "visual", "art"],
        "Marketing": ["marketing", "business", "digital", "strategy", "social-media"],
        "Business": ["business", "strategy", "leadership", "productivity", "goals"],
        "Programming": ["programming", "tech", "innovation", "challenging", "advanced"],
        "Data Science": ["science", "tech", "analytical", "challenging", "advanced"],
        "Music": ["music", "creative", "artistic", "relaxing", "art"],
        "Art": ["art", "creative", "artistic", "design", "visual"],
        "Photography": ["photography", "creative", "artistic", "visual", "art"],
        "Writing": ["writing", "creative", "storytelling", "artistic", "art"],
        "Gaming": ["tech", "creative", "innovation", "challenging", "fun"],
        "Sports": ["fitness", "wellness", "health", "energizing", "challenging"],
        "Fitness": ["fitness", "wellness", "health", "energizing", "workout"],
        "Cooking": ["culinary", "cooking", "creative", "lifestyle", "practical"],
        "Travel": ["lifestyle", "creative", "inspiring", "exploration", "learning"]
    }
    
    @classmethod
    def get_tag_affinity(cls, emotion: Emotion, tag: str) -> float:
        """Get affinity score for an emotion-tag pair"""
        return cls.EMOTION_TAG_AFFINITY.get(emotion, {}).get(tag.lower(), 0.5)
    
    @classmethod
    def get_category_affinity(cls, emotion: Emotion, category: str) -> float:
        """Get affinity score for an emotion-category pair"""
        return cls.EMOTION_CATEGORY_AFFINITY.get(emotion, {}).get(category.lower(), 0.5)
    
    @classmethod
    def get_energy_modifier(cls, energy: EnergyLevel, tag: str) -> float:
        """Get energy level modifier for a tag"""
        return cls.ENERGY_MODIFIERS.get(energy, {}).get(tag.lower(), 1.0)
    
    @classmethod
    def get_domain_category_affinity(cls, domain: str, category: str) -> float:
        """Get affinity score for activity domain-category pair"""
        return cls.ACTIVITY_DOMAIN_CATEGORY_AFFINITY.get(domain, {}).get(category.lower(), 0.5)
    
    @classmethod
    def get_interest_tags(cls, interest: str) -> List[str]:
        """Get associated tags for an interest"""
        return cls.INTEREST_TAG_MAPPING.get(interest, [])


# =============================================================================
# FEATURE ENGINEERING
# =============================================================================

class FeatureEncoder:
    """Encodes features for the neural network"""
    
    def __init__(self):
        self.emotion_encoder = {e.value: i for i, e in enumerate(Emotion)}
        self.energy_encoder = {e.value: i for i, e in enumerate(EnergyLevel)}
        self.tag_vocabulary: Dict[str, int] = {}
        self.category_vocabulary: Dict[str, int] = {}
        self.course_vocabulary: Dict[str, int] = {}
        self._is_fitted = False
    
    def fit(self, courses: List[CourseData]):
        """Build vocabularies from course data"""
        all_tags = set()
        all_categories = set()
        
        for course in courses:
            all_tags.update([t.lower() for t in course.tags])
            all_categories.add(course.category.lower())
            self.course_vocabulary[course.id] = len(self.course_vocabulary)
        
        # Create vocabularies with index 0 reserved for unknown
        self.tag_vocabulary = {"<UNK>": 0}
        for i, tag in enumerate(sorted(all_tags), 1):
            self.tag_vocabulary[tag] = i
        
        self.category_vocabulary = {"<UNK>": 0}
        for i, cat in enumerate(sorted(all_categories), 1):
            self.category_vocabulary[cat] = i
        
        self._is_fitted = True
        logger.info(f"Encoder fitted: {len(self.tag_vocabulary)} tags, "
                   f"{len(self.category_vocabulary)} categories, "
                   f"{len(self.course_vocabulary)} courses")
    
    @property
    def num_emotions(self) -> int:
        return len(Emotion)
    
    @property
    def num_energy_levels(self) -> int:
        return len(EnergyLevel)
    
    @property
    def num_tags(self) -> int:
        return len(self.tag_vocabulary)
    
    @property
    def num_categories(self) -> int:
        return len(self.category_vocabulary)
    
    @property
    def num_courses(self) -> int:
        return len(self.course_vocabulary)
    
    def encode_emotion(self, emotion: Emotion) -> int:
        """Encode emotion to integer"""
        return self.emotion_encoder.get(emotion.value, 0)
    
    def encode_energy(self, energy: EnergyLevel) -> int:
        """Encode energy level to integer"""
        return self.energy_encoder.get(energy.value, 0)
    
    def encode_tags(self, tags: List[str], max_tags: int = 10) -> np.ndarray:
        """Encode tags to multi-hot vector or padded sequence"""
        # Multi-hot encoding
        encoded = np.zeros(len(self.tag_vocabulary))
        for tag in tags:
            idx = self.tag_vocabulary.get(tag.lower(), 0)
            encoded[idx] = 1.0
        return encoded
    
    def encode_category(self, category: str) -> int:
        """Encode category to integer"""
        return self.category_vocabulary.get(category.lower(), 0)
    
    def encode_course_history(self, course_ids: List[str], max_courses: int = 20) -> np.ndarray:
        """Encode course history to multi-hot vector"""
        encoded = np.zeros(max(len(self.course_vocabulary) + 1, max_courses))
        for cid in course_ids[:max_courses]:
            idx = self.course_vocabulary.get(cid, 0)
            if idx < len(encoded):
                encoded[idx] = 1.0
        return encoded


# =============================================================================
# DEEP LEARNING MODEL
# =============================================================================

class EmotionRecommenderModel:
    """
    Deep Learning model for emotion-based course recommendations.
    Uses embedding layers for emotions, energy, tags, and categories.
    """
    
    def __init__(
        self,
        encoder: FeatureEncoder,
        embedding_dim: int = 32,
        hidden_dims: List[int] = [128, 64, 32]
    ):
        self.encoder = encoder
        self.embedding_dim = embedding_dim
        self.hidden_dims = hidden_dims
        self.model = None
        self.is_trained = False
        self._build_model()
    
    def _build_model(self):
        """Build the neural network architecture"""
        if not TF_AVAILABLE:
            logger.warning("TensorFlow not available, using rule-based fallback")
            return
        
        # Input layers
        emotion_input = keras.Input(shape=(1,), name='emotion_input')
        energy_input = keras.Input(shape=(1,), name='energy_input')
        course_tags_input = keras.Input(shape=(self.encoder.num_tags,), name='course_tags_input')
        course_category_input = keras.Input(shape=(1,), name='course_category_input')
        user_history_input = keras.Input(shape=(max(self.encoder.num_courses + 1, 20),), name='user_history_input')
        course_features_input = keras.Input(shape=(4,), name='course_features_input')  # rating, students, progress, duration
        
        # Embedding layers
        emotion_embedding = layers.Embedding(
            self.encoder.num_emotions + 1, 
            self.embedding_dim,
            name='emotion_embedding'
        )(emotion_input)
        emotion_flat = layers.Flatten()(emotion_embedding)
        
        energy_embedding = layers.Embedding(
            self.encoder.num_energy_levels + 1,
            self.embedding_dim // 2,
            name='energy_embedding'
        )(energy_input)
        energy_flat = layers.Flatten()(energy_embedding)
        
        category_embedding = layers.Embedding(
            self.encoder.num_categories + 1,
            self.embedding_dim,
            name='category_embedding'
        )(course_category_input)
        category_flat = layers.Flatten()(category_embedding)
        
        # Dense processing for tags
        tags_dense = layers.Dense(self.embedding_dim, activation='relu', name='tags_dense')(course_tags_input)
        tags_dense = layers.Dropout(0.2)(tags_dense)
        
        # Dense processing for user history
        history_dense = layers.Dense(self.embedding_dim, activation='relu', name='history_dense')(user_history_input)
        history_dense = layers.Dropout(0.2)(history_dense)
        
        # Combine all features
        combined = layers.Concatenate()([
            emotion_flat,
            energy_flat,
            category_flat,
            tags_dense,
            history_dense,
            course_features_input
        ])
        
        # Hidden layers
        x = combined
        for i, dim in enumerate(self.hidden_dims):
            x = layers.Dense(dim, activation='relu', name=f'hidden_{i}')(x)
            x = layers.BatchNormalization()(x)
            x = layers.Dropout(0.3)(x)
        
        # Output layer - recommendation score (0-1)
        output = layers.Dense(1, activation='sigmoid', name='recommendation_score')(x)
        
        # Build model
        self.model = Model(
            inputs=[
                emotion_input,
                energy_input,
                course_tags_input,
                course_category_input,
                user_history_input,
                course_features_input
            ],
            outputs=output
        )
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', 'mae']
        )
        
        logger.info("Deep learning model built successfully")
        logger.info(f"Model summary: {self.model.count_params()} parameters")
    
    def prepare_input(
        self,
        user_state: UserState,
        course: CourseData
    ) -> Dict[str, np.ndarray]:
        """Prepare input features for the model"""
        
        # Encode features
        emotion_encoded = np.array([[self.encoder.encode_emotion(user_state.current_emotion)]])
        energy_encoded = np.array([[self.encoder.encode_energy(user_state.energy_level)]])
        tags_encoded = self.encoder.encode_tags(course.tags).reshape(1, -1)
        category_encoded = np.array([[self.encoder.encode_category(course.category)]])
        
        # Combine enrolled and completed courses for history
        all_history = list(set(user_state.enrolled_courses + user_state.completed_courses))
        history_encoded = self.encoder.encode_course_history(all_history).reshape(1, -1)
        
        # Normalize course features
        rating_norm = course.rating / 5.0
        students_norm = min(course.students / 100000.0, 1.0)
        progress_norm = course.progress / 100.0 if course.progress else 0.0
        
        # Parse duration (e.g., "3h 24m" -> normalized hours)
        try:
            duration_parts = course.duration.lower().replace('h', ' ').replace('m', ' ').split()
            hours = float(duration_parts[0]) if duration_parts else 0
            minutes = float(duration_parts[1]) / 60 if len(duration_parts) > 1 else 0
            duration_norm = min((hours + minutes) / 10.0, 1.0)  # Normalize to 0-1 (10h max)
        except:
            duration_norm = 0.5
        
        course_features = np.array([[rating_norm, students_norm, progress_norm, duration_norm]])
        
        return {
            'emotion_input': emotion_encoded,
            'energy_input': energy_encoded,
            'course_tags_input': tags_encoded,
            'course_category_input': category_encoded,
            'user_history_input': history_encoded,
            'course_features_input': course_features
        }
    
    def predict_score(self, user_state: UserState, course: CourseData) -> float:
        """Predict recommendation score for a single course"""
        if not TF_AVAILABLE or self.model is None:
            return self._rule_based_score(user_state, course)
        
        inputs = self.prepare_input(user_state, course)
        score = self.model.predict(inputs, verbose=0)[0][0]
        return float(score)
    
    def _rule_based_score(self, user_state: UserState, course: CourseData) -> float:
        """
        Comprehensive rule-based scoring algorithm.
        
        All factors are percentage-based contributions:
        - Mood Match (25%): How well course matches emotional state
        - Energy Match (15%): How well course difficulty matches energy level
        - Activity Domain Match (15%): How relevant course is to user's professional domain
        - Interest Match (20%): How well course tags match user's selected interests
        - History Similarity (10%): Similarity to previously enjoyed courses
        - Popularity (15%): Course rating and enrollment numbers
        """
        score = 0.0
        
        # =====================================================================
        # 1. MOOD MATCH (25%)
        # How well course content matches current emotional state
        # =====================================================================
        mood_score = 0.0
        
        # Check tag-emotion affinity
        tag_affinities = []
        for tag in course.tags:
            affinity = EmotionTagAffinity.get_tag_affinity(user_state.current_emotion, tag)
            tag_affinities.append(affinity)
        
        if tag_affinities:
            mood_score = np.mean(tag_affinities)
        else:
            mood_score = 0.5
        
        # Also factor in category-emotion affinity (30% of mood score)
        category_affinity = EmotionTagAffinity.get_category_affinity(
            user_state.current_emotion, course.category
        )
        mood_score = (mood_score * 0.7) + (category_affinity * 0.3)
        
        score += mood_score * 0.25
        
        # =====================================================================
        # 2. ENERGY MATCH (15%)
        # How well course difficulty/intensity matches user's energy level
        # This is a SEPARATE percentage factor, not a modifier
        # =====================================================================
        energy_score = self._calculate_energy_match(course, user_state.energy_level)
        score += energy_score * 0.15
        
        # =====================================================================
        # 3. ACTIVITY DOMAIN MATCH (15%)
        # Match course category to user's professional domain
        # =====================================================================
        domain_score = 0.5  # Default neutral score
        
        if user_state.activity_domain:
            domain_score = EmotionTagAffinity.get_domain_category_affinity(
                user_state.activity_domain, course.category
            )
        
        score += domain_score * 0.15
        
        # =====================================================================
        # 4. INTEREST MATCH (20%)
        # Match course tags to user's selected interests
        # =====================================================================
        interest_score = 0.5  # Neutral default
        
        if user_state.interests:
            # Get all tags associated with user's interests
            interest_related_tags = set()
            for interest in user_state.interests:
                interest_related_tags.update(
                    EmotionTagAffinity.get_interest_tags(interest)
                )
            
            if interest_related_tags and course.tags:
                # Count how many course tags match interest-related tags
                course_tags_lower = set(t.lower() for t in course.tags)
                matches = course_tags_lower & interest_related_tags
                
                # Calculate interest score based on match ratio
                interest_score = len(matches) / max(len(course_tags_lower), 1)
                # Bonus if many matches
                if len(matches) >= 3:
                    interest_score = min(1.0, interest_score * 1.2)
        
        score += interest_score * 0.20
        
        # =====================================================================
        # 5. HISTORY SIMILARITY (10%)
        # Similar to courses user has completed/enrolled in
        # =====================================================================
        history_score = self._calculate_history_similarity(user_state, course)
        score += history_score * 0.10
        
        # =====================================================================
        # 6. POPULARITY (15%)
        # Rating and student count
        # =====================================================================
        rating_score = course.rating / 5.0
        popularity_score = min(course.students / 50000, 1.0)  # Cap at 50k
        combined_popularity = (rating_score * 0.7) + (popularity_score * 0.3)
        
        score += combined_popularity * 0.15
        
        return min(1.0, max(0.0, score))  # Clamp to 0-1
    
    def _calculate_energy_match(self, course: CourseData, energy: EnergyLevel) -> float:
        """
        Calculate how well course difficulty matches user's energy level.
        Returns a score from 0 to 1.
        
        LOW energy -> prefer easy, short, relaxing courses
        MEDIUM energy -> prefer balanced, practical courses
        HIGH energy -> prefer challenging, intensive courses
        """
        # Define course difficulty tags
        easy_tags = {'relaxing', 'easy', 'beginner', 'gentle', 'calm', 'introductory'}
        medium_tags = {'balanced', 'practical', 'moderate', 'fundamental', 'learning'}
        hard_tags = {'intensive', 'challenging', 'advanced', 'achievement', 'professional'}
        
        course_tags_lower = set(t.lower() for t in course.tags)
        
        # Count tag matches for each difficulty level
        easy_count = len(course_tags_lower & easy_tags)
        medium_count = len(course_tags_lower & medium_tags)
        hard_count = len(course_tags_lower & hard_tags)
        
        total_difficulty_tags = easy_count + medium_count + hard_count
        
        # Calculate difficulty profile (what % of difficulty tags are easy/medium/hard)
        if total_difficulty_tags > 0:
            easy_ratio = easy_count / total_difficulty_tags
            medium_ratio = medium_count / total_difficulty_tags
            hard_ratio = hard_count / total_difficulty_tags
        else:
            # No difficulty tags found, assume medium
            easy_ratio = 0.33
            medium_ratio = 0.34
            hard_ratio = 0.33
        
        # Also factor in course duration for difficulty assessment
        duration_difficulty = self._get_duration_difficulty(course.duration)
        
        # Blend tag-based difficulty with duration (70% tags, 30% duration)
        effective_easy = easy_ratio * 0.7 + (1.0 - duration_difficulty) * 0.3
        effective_hard = hard_ratio * 0.7 + duration_difficulty * 0.3
        
        # Calculate match based on energy level
        if energy == EnergyLevel.SCAZUTA:
            # Low energy: high score for easy courses, low for hard
            return effective_easy * 0.8 + (1.0 - effective_hard) * 0.2
            
        elif energy == EnergyLevel.RIDICATA:
            # High energy: high score for challenging courses
            return effective_hard * 0.8 + (1.0 - effective_easy) * 0.2
            
        else:  # MEDIE
            # Medium energy: prefer balanced, penalize extremes slightly
            balance_score = 1.0 - abs(effective_easy - effective_hard)
            return (medium_ratio * 0.5) + (balance_score * 0.5)
    
    def _get_duration_difficulty(self, duration: str) -> float:
        """
        Convert duration to difficulty score (0=short/easy, 1=long/hard).
        """
        try:
            duration_parts = duration.lower().replace('h', ' ').replace('m', ' ').split()
            hours = float(duration_parts[0]) if duration_parts else 3
            minutes = float(duration_parts[1]) / 60 if len(duration_parts) > 1 else 0
            total_hours = hours + minutes
        except:
            total_hours = 3  # Default
        
        # Map duration to 0-1 based on typical ranges
        # <= 2h = easy (0-0.3)
        # 2-5h = medium (0.3-0.6)
        # 5-8h = medium-hard (0.6-0.8)
        # > 8h = hard (0.8-1.0)
        if total_hours <= 2:
            return 0.15
        elif total_hours <= 5:
            return 0.35 + (total_hours - 2) * 0.08
        elif total_hours <= 8:
            return 0.6 + (total_hours - 5) * 0.067
        else:
            return min(1.0, 0.8 + (total_hours - 8) * 0.025)
    
    def _calculate_history_similarity(self, user_state: UserState, course: CourseData) -> float:
        """Calculate similarity to user's course history"""
        if not user_state.completed_courses and not user_state.enrolled_courses:
            return 0.5  # Neutral for new users
        
        # Use preferred tags if available
        if user_state.preferred_tags:
            course_tags_lower = set(t.lower() for t in course.tags)
            preferred_tags_lower = set(t.lower() for t in user_state.preferred_tags)
            common_tags = course_tags_lower & preferred_tags_lower
            
            if course.tags:
                return min(1.0, len(common_tags) / len(course.tags) * 1.5)
        
        return 0.5
    
    def train(
        self,
        training_data: List[Tuple[UserState, CourseData, float]],
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2
    ):
        """Train the model on user-course interaction data"""
        if not TF_AVAILABLE or self.model is None:
            logger.warning("Cannot train: TensorFlow not available")
            return
        
        if len(training_data) < 10:
            logger.warning("Insufficient training data")
            return
        
        # Prepare training data
        X = {
            'emotion_input': [],
            'energy_input': [],
            'course_tags_input': [],
            'course_category_input': [],
            'user_history_input': [],
            'course_features_input': []
        }
        y = []
        
        for user_state, course, label in training_data:
            inputs = self.prepare_input(user_state, course)
            for key in X:
                X[key].append(inputs[key][0])
            y.append(label)
        
        # Convert to numpy arrays
        for key in X:
            X[key] = np.array(X[key])
        y = np.array(y)
        
        # Train with early stopping
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True
        )
        
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[early_stop],
            verbose=1
        )
        
        self.is_trained = True
        logger.info(f"Model trained for {len(history.history['loss'])} epochs")
        return history
    
    def save(self, path: str):
        """Save model weights and encoder"""
        if TF_AVAILABLE and self.model:
            self.model.save_weights(f"{path}_weights.h5")
        
        # Save encoder
        with open(f"{path}_encoder.pkl", 'wb') as f:
            pickle.dump({
                'tag_vocabulary': self.encoder.tag_vocabulary,
                'category_vocabulary': self.encoder.category_vocabulary,
                'course_vocabulary': self.encoder.course_vocabulary
            }, f)
        
        logger.info(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load model weights and encoder"""
        if TF_AVAILABLE and self.model:
            weights_path = f"{path}_weights.h5"
            if os.path.exists(weights_path):
                self.model.load_weights(weights_path)
                self.is_trained = True
        
        encoder_path = f"{path}_encoder.pkl"
        if os.path.exists(encoder_path):
            with open(encoder_path, 'rb') as f:
                data = pickle.load(f)
                self.encoder.tag_vocabulary = data['tag_vocabulary']
                self.encoder.category_vocabulary = data['category_vocabulary']
                self.encoder.course_vocabulary = data['course_vocabulary']
        
        logger.info(f"Model loaded from {path}")


# =============================================================================
# RECOMMENDATION ENGINE
# =============================================================================

class EmotionBasedRecommendationEngine:
    """
    Main recommendation engine that combines deep learning with rule-based approaches.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.encoder = FeatureEncoder()
        self.model: Optional[EmotionRecommenderModel] = None
        self.courses: Dict[str, CourseData] = {}
        self.model_path = model_path
        self._initialized = False
    
    def initialize(self, courses: List[Dict[str, Any]]):
        """Initialize the engine with course data"""
        # Convert course dictionaries to CourseData objects
        self.courses = {}
        course_objects = []
        
        for c in courses:
            course = CourseData(
                id=c.get('id', ''),
                title=c.get('title', ''),
                category=c.get('category', ''),
                tags=c.get('tags', []),
                rating=float(c.get('rating', 0)),
                students=int(c.get('students', 0)),
                description=c.get('description', ''),
                duration=c.get('duration', '0h'),
                instructor=c.get('instructor', ''),
                enrolled=c.get('enrolled', False),
                progress=float(c.get('progress', 0)),
                created_at=c.get('created_at')
            )
            self.courses[course.id] = course
            course_objects.append(course)
        
        # Fit encoder
        self.encoder.fit(course_objects)
        
        # Initialize model
        self.model = EmotionRecommenderModel(self.encoder)
        
        # Load pre-trained weights if available
        if self.model_path and os.path.exists(f"{self.model_path}_encoder.pkl"):
            self.model.load(self.model_path)
        
        self._initialized = True
        logger.info(f"Engine initialized with {len(self.courses)} courses")
    
    def get_emotion_from_string(self, emotion_str: str) -> Emotion:
        """Convert string to Emotion enum"""
        emotion_map = {
            'felicit': Emotion.FERICIT,
            'motivat': Emotion.MOTIVAT,
            'relaxat': Emotion.RELAXAT,
            'curios': Emotion.CURIOS,
            'productiv': Emotion.PRODUCTIV,
            'creativ': Emotion.CREATIV,
        }
        return emotion_map.get(emotion_str.lower(), Emotion.CURIOS)
    
    def get_energy_from_string(self, energy_str: str) -> EnergyLevel:
        """Convert string to EnergyLevel enum"""
        energy_map = {
            'ridicata': EnergyLevel.RIDICATA,
            'medie': EnergyLevel.MEDIE,
            'scazuta': EnergyLevel.SCAZUTA,
        }
        return energy_map.get(energy_str.lower(), EnergyLevel.MEDIE)
    
    def create_user_state(self, user_data: Dict[str, Any]) -> UserState:
        """Create UserState from user data dictionary"""
        mood_data = user_data.get('dailyMood', {})
        
        # Extract interests from various possible locations in user data
        interests = user_data.get('interests', [])
        if not interests:
            questionnaire = user_data.get('initialQuestionnaire', {})
            interests = questionnaire.get('interests', [])
        
        # Extract activity domain
        activity_domain = user_data.get('activityDomain', '')
        if not activity_domain:
            questionnaire = user_data.get('initialQuestionnaire', {})
            activity_domain = questionnaire.get('activityDomain', '')
        
        return UserState(
            user_id=user_data.get('userId', user_data.get('user_id', '')),
            current_emotion=self.get_emotion_from_string(mood_data.get('mood', 'curios')),
            energy_level=self.get_energy_from_string(mood_data.get('energy', 'medie')),
            activity_domain=activity_domain,
            interests=interests,
            enrolled_courses=user_data.get('enrolledCourses', user_data.get('enrolled_courses', [])),
            completed_courses=user_data.get('completedCourses', user_data.get('completed_courses', [])),
            course_ratings=user_data.get('courseRatings', user_data.get('course_ratings', {})),
            interaction_history=user_data.get('interactionHistory', []),
            preferred_tags=self._extract_preferred_tags(user_data),
            preferred_categories=self._extract_preferred_categories(user_data)
        )
    
    def _extract_preferred_tags(self, user_data: Dict) -> List[str]:
        """Extract preferred tags from user history"""
        preferred = []
        
        # From completed courses
        for cid in user_data.get('completedCourses', user_data.get('completed_courses', [])):
            if cid in self.courses:
                preferred.extend(self.courses[cid].tags)
        
        # From enrolled courses
        for cid in user_data.get('enrolledCourses', user_data.get('enrolled_courses', [])):
            if cid in self.courses:
                preferred.extend(self.courses[cid].tags)
        
        return list(set(preferred))
    
    def _extract_preferred_categories(self, user_data: Dict) -> List[str]:
        """Extract preferred categories from user history"""
        categories = []
        
        for cid in user_data.get('completedCourses', user_data.get('completed_courses', [])):
            if cid in self.courses:
                categories.append(self.courses[cid].category)
        
        for cid in user_data.get('enrolledCourses', user_data.get('enrolled_courses', [])):
            if cid in self.courses:
                categories.append(self.courses[cid].category)
        
        return list(set(categories))
    
    def get_recommendations(
        self,
        user_data: Dict[str, Any],
        num_recommendations: int = 10,
        exclude_enrolled: bool = True,
        diversity_factor: float = 0.2
    ) -> List[Dict[str, Any]]:
        """
        Get personalized course recommendations.
        
        Args:
            user_data: User profile data including mood, energy, and course history
            num_recommendations: Number of recommendations to return
            exclude_enrolled: Whether to exclude already enrolled/completed courses
            diversity_factor: Factor to encourage diversity (0-1)
        
        Returns:
            List of recommended courses with scores and explanations
        """
        if not self._initialized:
            raise ValueError("Engine not initialized. Call initialize() first.")
        
        user_state = self.create_user_state(user_data)
        
        # Score all courses
        scored_courses = []
        
        for course_id, course in self.courses.items():
            # Skip enrolled/completed if requested
            if exclude_enrolled:
                if course_id in user_state.enrolled_courses or course_id in user_state.completed_courses:
                    continue
            
            # Get base score from model
            base_score = self.model.predict_score(user_state, course)
            
            # Apply diversity factor
            diversity_penalty = 0.0
            if user_state.preferred_categories and diversity_factor > 0:
                if course.category in user_state.preferred_categories:
                    # Slightly reduce score for categories user already explored
                    diversity_penalty = diversity_factor * 0.1
            
            final_score = base_score * (1 - diversity_penalty)
            
            # Generate explanation
            explanation = self._generate_explanation(user_state, course, base_score)
            
            scored_courses.append({
                'course': course,
                'score': final_score,
                'base_score': base_score,
                'explanation': explanation
            })
        
        # Sort by score
        scored_courses.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top N
        recommendations = []
        for item in scored_courses[:num_recommendations]:
            course = item['course']
            recommendations.append({
                'courseId': course.id,
                'title': course.title,
                'category': course.category,
                'tags': course.tags,
                'rating': course.rating,
                'students': course.students,
                'duration': course.duration,
                'instructor': course.instructor,
                'description': course.description,
                'recommendationScore': round(item['score'] * 100, 2),
                'explanation': item['explanation'],
                'matchFactors': self._get_match_factors(user_state, course)
            })
        
        return recommendations
    
    def _generate_explanation(self, user_state: UserState, course: CourseData, score: float) -> str:
        """Generate human-readable explanation for recommendation"""
        emotion_names = {
            Emotion.FERICIT: "fericit",
            Emotion.MOTIVAT: "motivat", 
            Emotion.RELAXAT: "relaxat",
            Emotion.CURIOS: "curios",
            Emotion.PRODUCTIV: "productiv",
            Emotion.CREATIV: "creativ"
        }
        
        energy_names = {
            EnergyLevel.RIDICATA: "ridicată",
            EnergyLevel.MEDIE: "medie",
            EnergyLevel.SCAZUTA: "scăzută"
        }
        
        emotion_name = emotion_names.get(user_state.current_emotion, "curios")
        energy_name = energy_names.get(user_state.energy_level, "medie")
        
        # Score-based prefix
        if score >= 0.8:
            prefix = "Potrivire excelentă! 🎯"
        elif score >= 0.6:
            prefix = "Potrivire bună! ✨"
        elif score >= 0.4:
            prefix = "Ar putea fi interesant 💡"
        else:
            prefix = "O opțiune de explorat 🔍"
        
        explanation_parts = [prefix]
        
        # Energy-based context
        if user_state.energy_level == EnergyLevel.SCAZUTA:
            # Check if course is suitable for low energy
            relaxing_tags = ['relaxing', 'easy', 'beginner', 'gentle', 'calm']
            if any(t.lower() in relaxing_tags for t in course.tags):
                explanation_parts.append("Perfect pentru energie scăzută - curs relaxant și accesibil.")
            elif any(t.lower() in ['intensive', 'challenging', 'advanced'] for t in course.tags):
                explanation_parts.append("Notă: Poate fi solicitant când ești obosit.")
        elif user_state.energy_level == EnergyLevel.RIDICATA:
            challenging_tags = ['intensive', 'challenging', 'advanced', 'achievement']
            if any(t.lower() in challenging_tags for t in course.tags):
                explanation_parts.append("Ideal pentru energia ta ridicată - provocator și intensiv!")
        
        # Emotion match
        emotion_tags = EmotionTagAffinity.EMOTION_TAG_AFFINITY.get(user_state.current_emotion, {})
        matched_emotion_tags = [t for t in course.tags if t.lower() in emotion_tags]
        if matched_emotion_tags:
            explanation_parts.append(f"Se potrivește cu starea ta de {emotion_name}.")
        
        # Interest match
        if user_state.interests:
            interest_related_tags = set()
            for interest in user_state.interests:
                interest_related_tags.update(EmotionTagAffinity.get_interest_tags(interest))
            
            course_tags_lower = set(t.lower() for t in course.tags)
            matched_interests = course_tags_lower & interest_related_tags
            if len(matched_interests) >= 2:
                explanation_parts.append("Se potrivește cu interesele tale.")
        
        # Domain match
        if user_state.activity_domain:
            domain_affinity = EmotionTagAffinity.get_domain_category_affinity(
                user_state.activity_domain, course.category
            )
            if domain_affinity >= 0.8:
                explanation_parts.append(f"Relevant pentru domeniul {user_state.activity_domain}.")
        
        # History match
        if user_state.preferred_tags:
            common = set(t.lower() for t in course.tags) & set(t.lower() for t in user_state.preferred_tags)
            if common:
                explanation_parts.append("Similar cu cursurile tale anterioare.")
        
        return " ".join(explanation_parts)
    
    def _get_match_factors(self, user_state: UserState, course: CourseData) -> Dict[str, float]:
        """Get breakdown of matching factors"""
        factors = {
            'emotionMatch': 0.0,
            'energyMatch': 0.0,
            'interestMatch': 0.0,
            'domainMatch': 0.0,
            'historyMatch': 0.0,
            'tagMatch': 0.0,
            'categoryMatch': 0.0
        }
        
        # Emotion match
        tag_affinities = []
        for tag in course.tags:
            affinity = EmotionTagAffinity.get_tag_affinity(user_state.current_emotion, tag)
            tag_affinities.append(affinity)
        factors['emotionMatch'] = np.mean(tag_affinities) if tag_affinities else 0.5
        
        # Energy match
        energy_mods = []
        for tag in course.tags:
            mod = EmotionTagAffinity.get_energy_modifier(user_state.energy_level, tag)
            energy_mods.append(mod)
        factors['energyMatch'] = np.mean(energy_mods) if energy_mods else 1.0
        
        # Category match
        factors['categoryMatch'] = EmotionTagAffinity.get_category_affinity(
            user_state.current_emotion, course.category
        )
        
        # Interest match
        if user_state.interests:
            interest_related_tags = set()
            for interest in user_state.interests:
                interest_related_tags.update(EmotionTagAffinity.get_interest_tags(interest))
            
            if interest_related_tags and course.tags:
                course_tags_lower = set(t.lower() for t in course.tags)
                matches = course_tags_lower & interest_related_tags
                factors['interestMatch'] = len(matches) / len(course_tags_lower)
        
        # Domain match
        if user_state.activity_domain:
            factors['domainMatch'] = EmotionTagAffinity.get_domain_category_affinity(
                user_state.activity_domain, course.category
            )
        else:
            factors['domainMatch'] = 0.5
        
        # History match
        if user_state.preferred_tags:
            common = set(t.lower() for t in course.tags) & set(t.lower() for t in user_state.preferred_tags)
            factors['historyMatch'] = len(common) / len(course.tags) if course.tags else 0.0
        
        # Tag diversity
        factors['tagMatch'] = min(len(course.tags) / 10.0, 1.0)  # Normalized by typical max tags
        
        return factors
    
    def record_interaction(
        self,
        user_id: str,
        course_id: str,
        interaction_type: str,
        rating: Optional[float] = None
    ):
        """Record user interaction for future training"""
        interaction = {
            'user_id': user_id,
            'course_id': course_id,
            'interaction_type': interaction_type,
            'rating': rating,
            'timestamp': datetime.now().isoformat()
        }
        
        # This would be stored in MongoDB in production
        logger.info(f"Recorded interaction: {interaction}")
        return interaction
    
    def get_mood_based_categories(self, emotion: Emotion) -> List[Dict[str, Any]]:
        """Get recommended categories for a specific emotion"""
        category_affinities = EmotionTagAffinity.EMOTION_CATEGORY_AFFINITY.get(emotion, {})
        
        sorted_categories = sorted(
            category_affinities.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {'category': cat, 'affinity': score}
            for cat, score in sorted_categories
        ]


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_sample_training_data(
    courses: List[CourseData],
    num_samples: int = 1000
) -> List[Tuple[UserState, CourseData, float]]:
    """Generate synthetic training data based on affinity rules"""
    training_data = []
    emotions_list = list(Emotion)
    energy_list = list(EnergyLevel)
    
    for _ in range(num_samples):
        # Random user state
        emotion = emotions_list[np.random.randint(0, len(emotions_list))]
        energy = energy_list[np.random.randint(0, len(energy_list))]
        
        user_state = UserState(
            user_id=f"synthetic_{np.random.randint(1000)}",
            current_emotion=emotion,
            energy_level=energy,
            enrolled_courses=[],
            completed_courses=[]
        )
        
        # Random course
        course = courses[np.random.randint(0, len(courses))]
        
        # Calculate label based on affinities
        tag_scores = [
            EmotionTagAffinity.get_tag_affinity(emotion, tag)
            for tag in course.tags
        ]
        category_score = EmotionTagAffinity.get_category_affinity(emotion, course.category)
        
        base_label = (np.mean(tag_scores) if tag_scores else 0.5) * 0.6 + category_score * 0.4
        
        # Add noise
        label = float(np.clip(base_label + np.random.normal(0, 0.1), 0, 1))
        
        training_data.append((user_state, course, label))
    
    return training_data


# =============================================================================
# MAIN / TESTING
# =============================================================================

if __name__ == "__main__":
    # Test the engine
    print("=" * 60)
    print("Emotion-Based Course Recommendation Engine - Test")
    print("=" * 60)
    
    # Sample courses
    sample_courses = [
        {
            'id': 'course-1',
            'title': 'Leadership Masterclass',
            'category': 'business',
            'tags': ['leadership', 'business', 'motivational', 'success', 'inspiring'],
            'rating': 4.9,
            'students': 12450,
            'description': 'Learn leadership skills',
            'duration': '3h 24m',
            'instructor': 'Sara Johnson'
        },
        {
            'id': 'course-2',
            'title': 'Fotografie Creativă',
            'category': 'creative',
            'tags': ['photography', 'creative', 'artistic', 'beginner', 'learning'],
            'rating': 4.8,
            'students': 8920,
            'description': 'Photography course',
            'duration': '5h 12m',
            'instructor': 'Mark Anderson'
        },
        {
            'id': 'course-3',
            'title': 'Web Development',
            'category': 'tech',
            'tags': ['tech', 'programming', 'innovation', 'learning', 'challenging'],
            'rating': 4.9,
            'students': 22100,
            'description': 'Full-stack web development',
            'duration': '8h 30m',
            'instructor': 'Alex Martinez'
        },
        {
            'id': 'course-4',
            'title': 'Mindfulness și Productivitate',
            'category': 'featured',
            'tags': ['relaxing', 'wellness', 'balanced', 'inspiring', 'easy'],
            'rating': 4.7,
            'students': 6540,
            'description': 'Mindfulness course',
            'duration': '2h 45m',
            'instructor': 'Lisa Brown'
        }
    ]
    
    # Initialize engine
    engine = EmotionBasedRecommendationEngine()
    engine.initialize(sample_courses)
    
    # Test user
    test_user = {
        'userId': 'test-user-1',
        'dailyMood': {
            'mood': 'motivat',
            'energy': 'ridicata'
        },
        'enrolledCourses': [],
        'completedCourses': [],
        'courseRatings': {}
    }
    
    print("\nTest User:")
    print(f"  Mood: {test_user['dailyMood']['mood']}")
    print(f"  Energy: {test_user['dailyMood']['energy']}")
    
    # Get recommendations
    recommendations = engine.get_recommendations(test_user, num_recommendations=3)
    
    print("\nTop Recommendations:")
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. {rec['title']}")
        print(f"   Category: {rec['category']}")
        print(f"   Tags: {', '.join(rec['tags'])}")
        print(f"   Score: {rec['recommendationScore']}%")
        print(f"   Explanation: {rec['explanation']}")
    
    print("\n" + "=" * 60)
    print("Test completed successfully!")
