"""
Sample Data & Testing Examples
Use this file to populate your database with sample courses and users
"""

SAMPLE_COURSES = [
    {
        "id": "course_001",
        "title": "Digital Painting Fundamentals",
        "category": "creative",
        "tags": ["art", "digital", "painting", "creative", "visual", "beginner", "artistic"],
        "rating": 4.9,
        "students": 45000,
        "description": "Learn digital painting techniques from scratch. Master color theory, brushwork, and composition.",
        "duration_minutes": 480,
        "instructor": "Master Artist",
        "difficulty": "beginner",
        "language": "en",
        "thumbnail": "https://example.com/thumb_001.jpg",
        "video_url": "https://example.com/video_001.mp4"
    },
    {
        "id": "course_002",
        "title": "Advanced Motion Graphics",
        "category": "creative",
        "tags": ["animation", "motion", "graphics", "advanced", "visual", "technical", "intensive"],
        "rating": 4.7,
        "students": 32000,
        "description": "Create stunning motion graphics animations. Learn animation principles and advanced techniques.",
        "duration_minutes": 360,
        "instructor": "Animation Pro",
        "difficulty": "advanced",
        "language": "en"
    },
    {
        "id": "course_003",
        "title": "Python Mastery",
        "category": "tech",
        "tags": ["python", "programming", "coding", "advanced", "practical", "intensive", "technical"],
        "rating": 4.8,
        "students": 89000,
        "description": "Master Python programming from basics to advanced concepts. Learn design patterns and best practices.",
        "duration_minutes": 540,
        "instructor": "Code Master",
        "difficulty": "advanced",
        "language": "en"
    },
    {
        "id": "course_004",
        "title": "React Web Development",
        "category": "tech",
        "tags": ["react", "web", "javascript", "frontend", "interactive", "practical", "hands-on"],
        "rating": 4.9,
        "students": 120000,
        "description": "Build modern web applications with React. Learn components, hooks, and state management.",
        "duration_minutes": 420,
        "instructor": "Web Guru",
        "difficulty": "intermediate",
        "language": "en"
    },
    {
        "id": "course_005",
        "title": "Business Strategy & Growth",
        "category": "business",
        "tags": ["business", "strategy", "management", "professional", "advanced", "goal-oriented", "career-focused"],
        "rating": 4.6,
        "students": 28000,
        "description": "Master business strategy and growth techniques. Learn from industry leaders and case studies.",
        "duration_minutes": 300,
        "instructor": "Business Consultant",
        "difficulty": "advanced",
        "language": "en"
    },
    {
        "id": "course_006",
        "title": "Yoga for Beginners",
        "category": "wellness",
        "tags": ["yoga", "wellness", "health", "relaxing", "beginner", "meditative", "gentle", "peaceful"],
        "rating": 4.8,
        "students": 67000,
        "description": "Start your yoga journey. Learn basic poses, breathing techniques, and mindfulness.",
        "duration_minutes": 240,
        "instructor": "Yoga Master",
        "difficulty": "beginner",
        "language": "en"
    },
    {
        "id": "course_007",
        "title": "Mindfulness & Meditation",
        "category": "wellness",
        "tags": ["meditation", "mindfulness", "wellness", "relaxing", "peaceful", "mental-health", "inspiring"],
        "rating": 4.9,
        "students": 52000,
        "description": "Develop a mindfulness practice. Learn meditation techniques for stress relief and inner peace.",
        "duration_minutes": 180,
        "instructor": "Meditation Expert",
        "difficulty": "beginner",
        "language": "en"
    },
    {
        "id": "course_008",
        "title": "Gourmet Cooking Masterclass",
        "category": "culinary",
        "tags": ["cooking", "culinary", "food", "practical", "hands-on", "intermediate", "interactive"],
        "rating": 4.7,
        "students": 38000,
        "description": "Master essential cooking techniques. Learn recipes from professional chefs.",
        "duration_minutes": 360,
        "instructor": "Chef Professional",
        "difficulty": "intermediate",
        "language": "en"
    },
    {
        "id": "course_009",
        "title": "Music Production Basics",
        "category": "music",
        "tags": ["music", "production", "audio", "creative", "technical", "hands-on", "practical"],
        "rating": 4.8,
        "students": 41000,
        "description": "Create music from scratch. Learn music theory, production, and sound design.",
        "duration_minutes": 420,
        "instructor": "Producer",
        "difficulty": "intermediate",
        "language": "en"
    },
    {
        "id": "course_010",
        "title": "Photography Masterclass",
        "category": "photography",
        "tags": ["photography", "visual", "creative", "artistic", "advanced", "practical", "visual"],
        "rating": 4.9,
        "students": 55000,
        "description": "Master photography techniques. Learn composition, lighting, and editing.",
        "duration_minutes": 500,
        "instructor": "Professional Photographer",
        "difficulty": "advanced",
        "language": "en"
    },
    {
        "id": "course_011",
        "title": "UI/UX Design Essentials",
        "category": "design",
        "tags": ["design", "ui", "ux", "creative", "technical", "practical", "interactive"],
        "rating": 4.8,
        "students": 51000,
        "description": "Learn modern UI/UX design principles. Create beautiful and functional interfaces.",
        "duration_minutes": 380,
        "instructor": "Design Expert",
        "difficulty": "intermediate",
        "language": "en"
    },
    {
        "id": "course_012",
        "title": "Graphic Design Fundamentals",
        "category": "design",
        "tags": ["design", "graphics", "creative", "artistic", "visual", "beginner", "practical"],
        "rating": 4.7,
        "students": 39000,
        "description": "Learn graphic design basics. Master typography, color theory, and composition.",
        "duration_minutes": 320,
        "instructor": "Designer",
        "difficulty": "beginner",
        "language": "en"
    },
    {
        "id": "course_013",
        "title": "Leadership & Management",
        "category": "business",
        "tags": ["leadership", "management", "business", "professional", "advanced", "career-focused"],
        "rating": 4.6,
        "students": 34000,
        "description": "Develop leadership skills. Learn to manage teams and organizations effectively.",
        "duration_minutes": 270,
        "instructor": "Leadership Coach",
        "difficulty": "advanced",
        "language": "en"
    },
    {
        "id": "course_014",
        "title": "Web Design with CSS",
        "category": "tech",
        "tags": ["web", "design", "css", "frontend", "creative", "practical", "interactive"],
        "rating": 4.7,
        "students": 61000,
        "description": "Create beautiful websites with CSS. Learn layouts, animations, and responsive design.",
        "duration_minutes": 340,
        "instructor": "Web Designer",
        "difficulty": "beginner",
        "language": "en"
    },
    {
        "id": "course_015",
        "title": "Video Editing Masterclass",
        "category": "creative",
        "tags": ["video", "editing", "creative", "technical", "practical", "advanced", "visual"],
        "rating": 4.8,
        "students": 43000,
        "description": "Master video editing. Learn color grading, effects, and post-production.",
        "duration_minutes": 450,
        "instructor": "Video Editor",
        "difficulty": "intermediate",
        "language": "en"
    }
]

SAMPLE_USERS = [
    {
        "user_id": "user_001",
        "name": "John Doe",
        "email": "john@example.com",
        "current_mood": "creative",
        "enrolled_courses": ["course_001", "course_002"],
        "completed_courses": ["course_001"],
        "course_ratings": {
            "course_001": 4.8,
            "course_002": 3.9
        },
        "watched_minutes": {
            "course_001": 480,
            "course_002": 120
        },
        "learning_level": "beginner",
        "learning_style": "visual"
    },
    {
        "user_id": "user_002",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "current_mood": "focused",
        "enrolled_courses": ["course_003", "course_004"],
        "completed_courses": ["course_003"],
        "course_ratings": {
            "course_003": 4.7,
            "course_004": 4.5
        },
        "watched_minutes": {
            "course_003": 540,
            "course_004": 200
        },
        "learning_level": "advanced",
        "learning_style": "mixed"
    },
    {
        "user_id": "user_003",
        "name": "Mike Johnson",
        "email": "mike@example.com",
        "current_mood": "relaxed",
        "enrolled_courses": ["course_006"],
        "completed_courses": ["course_006"],
        "course_ratings": {
            "course_006": 4.9
        },
        "watched_minutes": {
            "course_006": 240
        },
        "learning_level": "beginner",
        "learning_style": "auditory"
    },
    {
        "user_id": "user_004",
        "name": "Sarah Williams",
        "email": "sarah@example.com",
        "current_mood": "motivated",
        "enrolled_courses": ["course_005", "course_013"],
        "completed_courses": ["course_005"],
        "course_ratings": {
            "course_005": 4.6,
            "course_013": 4.4
        },
        "watched_minutes": {
            "course_005": 300,
            "course_013": 80
        },
        "learning_level": "advanced",
        "learning_style": "reading"
    },
    {
        "user_id": "user_005",
        "name": "Alex Brown",
        "email": "alex@example.com",
        "current_mood": "curious",
        "enrolled_courses": ["course_008", "course_009"],
        "completed_courses": [],
        "course_ratings": {
            "course_008": 4.2,
            "course_009": 4.1
        },
        "watched_minutes": {
            "course_008": 120,
            "course_009": 100
        },
        "learning_level": "intermediate",
        "learning_style": "kinesthetic"
    }
]

TEST_SCENARIOS = [
    {
        "name": "Creative User - First Time",
        "user_id": "test_creative_001",
        "mood": "creative",
        "enrolled": [],
        "completed": [],
        "ratings": {},
        "expected_categories": ["creative", "design", "music", "photography", "art"],
        "expected_count": 5
    },
    {
        "name": "Focused Developer - Advanced",
        "user_id": "test_focused_001",
        "mood": "focused",
        "enrolled": ["course_003"],
        "completed": ["course_003"],
        "ratings": {"course_003": 4.8},
        "expected_categories": ["tech", "business", "design"],
        "expected_count": 5
    },
    {
        "name": "Stressed User - Needs Support",
        "user_id": "test_stressed_001",
        "mood": "stressed",
        "enrolled": [],
        "completed": [],
        "ratings": {},
        "expected_categories": ["wellness", "meditation", "yoga"],
        "expected_count": 5
    },
    {
        "name": "Curious Learner - Exploration",
        "user_id": "test_curious_001",
        "mood": "curious",
        "enrolled": ["course_008"],
        "completed": [],
        "ratings": {"course_008": 4.2},
        "expected_categories": ["tech", "design", "creative"],
        "expected_count": 5
    }
]

MOOD_TO_EMOJI = {
    "energetic": "🔥",
    "calm": "😌",
    "creative": "🎨",
    "focused": "💻",
    "motivated": "💪",
    "relaxed": "🧘",
    "curious": "📚",
    "inspired": "✨",
    "stressed": "😰",
    "confused": "😕"
}

CATEGORY_EMOJI = {
    "creative": "🎨",
    "tech": "💻",
    "business": "💼",
    "wellness": "🧘",
    "culinary": "👨‍🍳",
    "music": "🎵",
    "photography": "📷",
    "design": "✏️"
}

def print_sample_data():
    """Print sample data overview"""
    print("\n" + "="*80)
    print("SAMPLE DATA OVERVIEW".center(80))
    print("="*80)
    
    print(f"\n📚 Courses ({len(SAMPLE_COURSES)} total):")
    for course in SAMPLE_COURSES:
        emoji = CATEGORY_EMOJI.get(course["category"], "📖")
        print(f"  {emoji} {course['title']} ({course['category']})")
    
    print(f"\n👥 Sample Users ({len(SAMPLE_USERS)} total):")
    for user in SAMPLE_USERS:
        mood_emoji = MOOD_TO_EMOJI.get(user["current_mood"], "❓")
        print(f"  {mood_emoji} {user['name']} - Mood: {user['current_mood']}")
        print(f"      Enrolled: {len(user['enrolled_courses'])}, Completed: {len(user['completed_courses'])}")
    
    print(f"\n🧪 Test Scenarios ({len(TEST_SCENARIOS)} total):")
    for scenario in TEST_SCENARIOS:
        mood_emoji = MOOD_TO_EMOJI.get(scenario["mood"], "❓")
        print(f"  {mood_emoji} {scenario['name']}")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    print_sample_data()
