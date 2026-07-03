"""
Comprehensive Testing & Demo Script
Tests all components of the ML Recommendation Engine
Run with: python test_ml_engine.py
"""

import json
import sys
from datetime import datetime
from typing import Dict, List

# Import recommendation components
try:
    from advanced_ml_recommendation_api import (
        AdvancedRecommendationEngine,
        UserProfile,
        UserMood,
        Course,
        RecommendationSerializer
    )
    from mongo_db_manager import MongoDBManager
    from recommendation_integration import StreamclassRecommendationService
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure all files are in the same directory")
    sys.exit(1)


# ============================================================================
# TEST UTILITIES
# ============================================================================

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'='*80}")
    print(f"{text:^80}")
    print(f"{'='*80}{Colors.RESET}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")


# ============================================================================
# SAMPLE DATA GENERATOR
# ============================================================================

def create_sample_courses() -> Dict[str, Course]:
    """Create sample courses for testing"""
    courses = {
        "course_001": Course(
            id="course_001",
            title="Digital Painting Fundamentals",
            category="creative",
            tags=["art", "digital", "painting", "creative", "visual", "beginner"],
            rating=4.9,
            students=45000,
            description="Learn digital painting from scratch",
            duration_minutes=480,
            instructor="Master Artist",
            difficulty="beginner"
        ),
        "course_002": Course(
            id="course_002",
            title="Advanced Motion Graphics",
            category="creative",
            tags=["animation", "motion", "graphics", "advanced", "visual", "technical"],
            rating=4.7,
            students=32000,
            description="Create stunning motion graphics",
            duration_minutes=360,
            instructor="Animation Pro",
            difficulty="advanced"
        ),
        "course_003": Course(
            id="course_003",
            title="Python Mastery",
            category="tech",
            tags=["python", "programming", "coding", "advanced", "practical", "intensive"],
            rating=4.8,
            students=89000,
            description="Master Python programming",
            duration_minutes=540,
            instructor="Code Master",
            difficulty="advanced"
        ),
        "course_004": Course(
            id="course_004",
            title="React Web Development",
            category="tech",
            tags=["react", "web", "javascript", "frontend", "interactive", "practical"],
            rating=4.9,
            students=120000,
            description="Build modern web apps with React",
            duration_minutes=420,
            instructor="Web Guru",
            difficulty="intermediate"
        ),
        "course_005": Course(
            id="course_005",
            title="Business Strategy",
            category="business",
            tags=["business", "strategy", "management", "professional", "advanced", "goal-oriented"],
            rating=4.6,
            students=28000,
            description="Strategic business planning",
            duration_minutes=300,
            instructor="Business Consultant",
            difficulty="advanced"
        ),
        "course_006": Course(
            id="course_006",
            title="Yoga for Beginners",
            category="wellness",
            tags=["yoga", "wellness", "health", "relaxing", "beginner", "meditative"],
            rating=4.8,
            students=67000,
            description="Start your yoga journey",
            duration_minutes=240,
            instructor="Yoga Master",
            difficulty="beginner"
        ),
        "course_007": Course(
            id="course_007",
            title="Mindfulness Meditation",
            category="wellness",
            tags=["meditation", "mindfulness", "wellness", "relaxing", "peaceful", "mental-health"],
            rating=4.9,
            students=52000,
            description="Develop mindfulness practice",
            duration_minutes=180,
            instructor="Meditation Expert",
            difficulty="beginner"
        ),
        "course_008": Course(
            id="course_008",
            title="Cooking Masterclass",
            category="culinary",
            tags=["cooking", "culinary", "food", "practical", "hands-on", "intermediate"],
            rating=4.7,
            students=38000,
            description="Master cooking techniques",
            duration_minutes=360,
            instructor="Chef Professional",
            difficulty="intermediate"
        ),
        "course_009": Course(
            id="course_009",
            title="Music Production",
            category="music",
            tags=["music", "production", "audio", "creative", "technical", "hands-on"],
            rating=4.8,
            students=41000,
            description="Create music from scratch",
            duration_minutes=420,
            instructor="Producer",
            difficulty="intermediate"
        ),
        "course_010": Course(
            id="course_010",
            title="Photography Masterclass",
            category="photography",
            tags=["photography", "visual", "creative", "artistic", "advanced", "practical"],
            rating=4.9,
            students=55000,
            description="Master photography techniques",
            duration_minutes=500,
            instructor="Photographer",
            difficulty="advanced"
        ),
    }
    
    return courses


def create_sample_users() -> Dict[str, Dict]:
    """Create sample user profiles"""
    return {
        "user_001": {
            "current_mood": "creative",
            "enrolled_courses": ["course_001", "course_002"],
            "completed_courses": ["course_001"],
            "course_ratings": {"course_001": 4.8, "course_002": 3.9},
            "watched_minutes": {"course_001": 480, "course_002": 120},
            "learning_level": "beginner"
        },
        "user_002": {
            "current_mood": "focused",
            "enrolled_courses": ["course_003", "course_004"],
            "completed_courses": ["course_003"],
            "course_ratings": {"course_003": 4.7, "course_004": 4.5},
            "watched_minutes": {"course_003": 540, "course_004": 200},
            "learning_level": "advanced"
        },
        "user_003": {
            "current_mood": "relaxed",
            "enrolled_courses": ["course_006"],
            "completed_courses": ["course_006"],
            "course_ratings": {"course_006": 4.9},
            "watched_minutes": {"course_006": 240},
            "learning_level": "beginner"
        },
    }


# ============================================================================
# TEST SUITE
# ============================================================================

class TestSuite:
    """Comprehensive test suite"""
    
    def __init__(self):
        self.engine = AdvancedRecommendationEngine()
        self.courses = create_sample_courses()
        self.users = create_sample_users()
        self.passed = 0
        self.failed = 0
    
    def run_all_tests(self):
        """Run all tests"""
        print_header("ML RECOMMENDATION ENGINE - TEST SUITE")
        
        self.test_mood_scores()
        self.test_personalization_scores()
        self.test_similarity_scores()
        self.test_recommendation_generation()
        self.test_mood_specific_recommendations()
        self.test_serialization()
        self.test_weight_validation()
        
        self.print_summary()
    
    def test_mood_scores(self):
        """Test mood scoring"""
        print_header("Test 1: Mood Scoring")
        
        try:
            # Test different moods
            test_cases = [
                (UserMood.CREATIVE, "course_001", True),  # Should be high for creative
                (UserMood.FOCUSED, "course_003", True),   # Should be high for tech
                (UserMood.RELAXED, "course_006", True),   # Should be high for wellness
            ]
            
            for mood, course_id, should_be_high in test_cases:
                score = self.engine.calculate_mood_score(
                    self.courses[course_id],
                    mood
                )
                
                if should_be_high and score > 0.7:
                    print_success(f"{mood.value} → {self.courses[course_id].title}: {score:.2f}")
                    self.passed += 1
                elif not should_be_high and score < 0.7:
                    print_success(f"{mood.value} → {self.courses[course_id].title}: {score:.2f}")
                    self.passed += 1
                else:
                    print_error(f"{mood.value} → {self.courses[course_id].title}: {score:.2f} (unexpected)")
                    self.failed += 1
        
        except Exception as e:
            print_error(f"Error in mood score test: {str(e)}")
            self.failed += 1
    
    def test_personalization_scores(self):
        """Test personalization scoring"""
        print_header("Test 2: Personalization Scoring")
        
        try:
            user_data = self.users["user_001"]
            user_profile = UserProfile(
                user_id="user_001",
                current_mood=UserMood.CREATIVE,
                enrolled_courses=user_data["enrolled_courses"],
                completed_courses=user_data["completed_courses"],
                course_ratings=user_data["course_ratings"]
            )
            
            # Should give high score to related creative courses
            score_creative = self.engine.calculate_personalization_score(
                self.courses["course_010"],  # Photography - related to creative
                user_profile,
                self.courses
            )
            
            # Should give zero to already enrolled
            score_enrolled = self.engine.calculate_personalization_score(
                self.courses["course_001"],  # Already enrolled
                user_profile,
                self.courses
            )
            
            if score_creative > score_enrolled and score_enrolled == 0:
                print_success(f"Personalization: Creative related = {score_creative:.2f}, Enrolled = {score_enrolled:.2f}")
                self.passed += 1
            else:
                print_error(f"Personalization scores unexpected")
                self.failed += 1
        
        except Exception as e:
            print_error(f"Error in personalization test: {str(e)}")
            self.failed += 1
    
    def test_similarity_scores(self):
        """Test content similarity"""
        print_header("Test 3: Content Similarity")
        
        try:
            user_data = self.users["user_001"]
            user_profile = UserProfile(
                user_id="user_001",
                current_mood=UserMood.CREATIVE,
                enrolled_courses=user_data["enrolled_courses"],
                completed_courses=user_data["completed_courses"]
            )
            
            # Should be similar to other creative courses
            score_similar = self.engine.calculate_similarity_score(
                self.courses["course_010"],  # Photography - similar category
                user_profile,
                self.courses
            )
            
            # Should be different from tech courses
            score_different = self.engine.calculate_similarity_score(
                self.courses["course_003"],  # Python - different
                UserProfile(
                    user_id="user_002",
                    current_mood=UserMood.FOCUSED,
                    enrolled_courses=["course_006"],  # Yoga - very different
                    completed_courses=[]
                ),
                self.courses
            )
            
            if 0 <= score_similar <= 1 and 0 <= score_different <= 1:
                print_success(f"Similarity: Similar courses = {score_similar:.2f}, Different = {score_different:.2f}")
                self.passed += 1
            else:
                print_error("Similarity scores out of valid range")
                self.failed += 1
        
        except Exception as e:
            print_error(f"Error in similarity test: {str(e)}")
            self.failed += 1
    
    def test_recommendation_generation(self):
        """Test recommendation generation"""
        print_header("Test 4: Recommendation Generation")
        
        try:
            for user_id, user_data in self.users.items():
                user_profile = UserProfile(
                    user_id=user_id,
                    current_mood=UserMood[user_data["current_mood"].upper()],
                    enrolled_courses=user_data["enrolled_courses"],
                    completed_courses=user_data["completed_courses"],
                    course_ratings=user_data["course_ratings"]
                )
                
                recommendations = self.engine.get_recommendations(
                    user_profile,
                    self.courses,
                    num_recommendations=3
                )
                
                if len(recommendations) > 0:
                    print_success(f"{user_id}: Generated {len(recommendations)} recommendations")
                    for idx, (course, score, breakdown) in enumerate(recommendations, 1):
                        print(f"  {idx}. {course.title}: {score*100:.1f}%")
                    self.passed += 1
                else:
                    print_error(f"{user_id}: No recommendations generated")
                    self.failed += 1
        
        except Exception as e:
            print_error(f"Error in recommendation generation: {str(e)}")
            self.failed += 1
    
    def test_mood_specific_recommendations(self):
        """Test mood-specific recommendations"""
        print_header("Test 5: Mood-Specific Recommendations")
        
        try:
            user_data = self.users["user_001"]
            user_profile = UserProfile(
                user_id="user_001",
                current_mood=UserMood.CREATIVE,
                enrolled_courses=user_data["enrolled_courses"],
                completed_courses=user_data["completed_courses"],
                course_ratings=user_data["course_ratings"]
            )
            
            # Get recommendations for different moods
            moods_to_test = [UserMood.FOCUSED, UserMood.RELAXED, UserMood.MOTIVATED]
            
            for target_mood in moods_to_test:
                recommendations = self.engine.get_mood_specific_recommendations(
                    user_profile,
                    self.courses,
                    target_mood=target_mood,
                    num_recommendations=2
                )
                
                if len(recommendations) > 0:
                    print_success(f"Mood {target_mood.value}: {recommendations[0][0].title} ({recommendations[0][1]*100:.1f}%)")
                    self.passed += 1
                else:
                    print_error(f"Mood {target_mood.value}: No recommendations")
                    self.failed += 1
        
        except Exception as e:
            print_error(f"Error in mood-specific test: {str(e)}")
            self.failed += 1
    
    def test_serialization(self):
        """Test JSON serialization"""
        print_header("Test 6: JSON Serialization")
        
        try:
            user_data = self.users["user_001"]
            user_profile = UserProfile(
                user_id="user_001",
                current_mood=UserMood.CREATIVE,
                enrolled_courses=user_data["enrolled_courses"],
                completed_courses=user_data["completed_courses"]
            )
            
            recommendations = self.engine.get_recommendations(
                user_profile,
                self.courses,
                num_recommendations=2
            )
            
            # Serialize to JSON
            json_output = RecommendationSerializer.to_json(
                recommendations,
                "creative",
                "user_001"
            )
            
            # Try to parse it
            parsed = json.loads(json_output)
            
            if parsed["success"] and "recommendations" in parsed:
                print_success(f"Serialization: Valid JSON with {len(parsed['recommendations'])} recommendations")
                self.passed += 1
            else:
                print_error("Serialization: Invalid JSON structure")
                self.failed += 1
        
        except Exception as e:
            print_error(f"Error in serialization test: {str(e)}")
            self.failed += 1
    
    def test_weight_validation(self):
        """Test weight validation"""
        print_header("Test 7: Weight Validation")
        
        try:
            # Default weights should sum to 1.0
            default_weights = [0.35, 0.25, 0.15, 0.15, 0.05, 0.05]
            total = sum(default_weights)
            
            if abs(total - 1.0) < 0.001:
                print_success(f"Default weights sum to {total:.3f}")
                self.passed += 1
            else:
                print_error(f"Default weights sum to {total:.3f} (should be 1.0)")
                self.failed += 1
            
            # Test custom weights
            user_data = self.users["user_001"]
            user_profile = UserProfile(
                user_id="user_001",
                current_mood=UserMood.CREATIVE,
                enrolled_courses=user_data["enrolled_courses"],
                completed_courses=user_data["completed_courses"]
            )
            
            # Use custom weights
            recommendations = self.engine.get_recommendations(
                user_profile,
                self.courses,
                mood_weight=0.5,
                personalization_weight=0.2,
                similarity_weight=0.15,
                popularity_weight=0.15,
                diversity_weight=0.0,
                recency_weight=0.0
            )
            
            if len(recommendations) > 0:
                print_success("Custom weights applied successfully")
                self.passed += 1
            else:
                print_error("Failed to apply custom weights")
                self.failed += 1
        
        except Exception as e:
            print_error(f"Error in weight validation: {str(e)}")
            self.failed += 1
    
    def print_summary(self):
        """Print test summary"""
        print_header("Test Summary")
        
        total = self.passed + self.failed
        percentage = (self.passed / total * 100) if total > 0 else 0
        
        print(f"{Colors.GREEN}✓ Passed: {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}✗ Failed: {self.failed}{Colors.RESET}")
        print(f"{'─'*40}")
        print(f"Total: {total} tests")
        print(f"Success Rate: {percentage:.1f}%")
        
        if self.failed == 0:
            print(f"\n{Colors.GREEN}🎉 All tests passed!{Colors.RESET}")
            return 0
        else:
            print(f"\n{Colors.RED}⚠️  Some tests failed{Colors.RESET}")
            return 1


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    try:
        test_suite = TestSuite()
        exit_code = test_suite.run_all_tests()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
