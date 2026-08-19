"""
Flask API Server for Emotion-Based Course Recommendations
=========================================================
REST API endpoints for integrating the ML recommendation engine
with the React frontend.

Endpoints:
- POST /api/recommendations - Get personalized recommendations
- POST /api/recommendations/mood - Get recommendations for specific mood
- POST /api/interactions - Record user interactions
- GET /api/health - Health check

Author: StreamClass ML Team
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from emotion_based_recommender import (
    EmotionBasedRecommendationEngine,
    Emotion,
    EnergyLevel
)

# Try to import MongoDB manager
try:
    from mongo_db_manager import MongoDBManager
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    logging.warning("MongoDB manager not available")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
# Allow all origins for development to support mobile access
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Global instances
recommendation_engine: Optional[EmotionBasedRecommendationEngine] = None
db_manager: Optional[MongoDBManager] = None


def get_default_courses() -> List[Dict[str, Any]]:
    """Return default courses if database is not available"""
    return [
        {
            'id': 'course-1',
            'title': 'Leadership Masterclass: Inspira și Motivează',
            'category': 'business',
            'tags': ['leadership', 'business', 'motivational', 'success', 'inspiring'],
            'rating': 4.9,
            'students': 12450,
            'description': 'Învață cum să devii un lider inspirațional și să motivezi echipele către succes.',
            'duration': '3h 24m',
            'instructor': 'Sara Johnson'
        },
        {
            'id': 'course-2',
            'title': 'Fotografie Creativă: De la Începător la Expert',
            'category': 'creative',
            'tags': ['photography', 'creative', 'artistic', 'beginner', 'learning'],
            'rating': 4.8,
            'students': 8920,
            'description': 'Dezvoltă-ți abilitățile de fotografie și creează imagini uimitoare.',
            'duration': '5h 12m',
            'instructor': 'Mark Anderson'
        },
        {
            'id': 'course-3',
            'title': 'Business Strategy: Planificare și Execuție',
            'category': 'business',
            'tags': ['business', 'strategy', 'productivity', 'efficiency', 'advanced'],
            'rating': 4.7,
            'students': 15230,
            'description': 'Strategii eficiente de business pentru creștere și succes sustenabil.',
            'duration': '4h 45m',
            'instructor': 'David Chen'
        },
        {
            'id': 'course-4',
            'title': 'Web Development: Creează Aplicații Moderne',
            'category': 'tech',
            'tags': ['tech', 'programming', 'innovation', 'learning', 'challenging'],
            'rating': 4.9,
            'students': 22100,
            'description': 'Învață tehnologiile moderne pentru dezvoltare web full-stack.',
            'duration': '8h 30m',
            'instructor': 'Alex Martinez'
        },
        {
            'id': 'course-5',
            'title': 'Graphic Design: Adobe Creative Suite',
            'category': 'creative',
            'tags': ['design', 'creative', 'art', 'practical', 'artistic'],
            'rating': 4.8,
            'students': 9850,
            'description': 'Stăpânește design-ul grafic folosind Adobe Photoshop, Illustrator și InDesign.',
            'duration': '6h 15m',
            'instructor': 'Emma Wilson'
        },
        {
            'id': 'course-6',
            'title': 'Mindfulness și Productivitate',
            'category': 'featured',
            'tags': ['relaxing', 'wellness', 'balanced', 'inspiring', 'easy', 'beginner'],
            'rating': 4.7,
            'students': 6540,
            'description': 'Găsește echilibrul perfect între relaxare și productivitate maximă.',
            'duration': '2h 45m',
            'instructor': 'Lisa Brown'
        },
        {
            'id': 'course-7',
            'title': 'Data Science Fundamentals',
            'category': 'tech',
            'tags': ['tech', 'science', 'analytical', 'challenging', 'advanced', 'learning'],
            'rating': 4.8,
            'students': 18500,
            'description': 'Descoperă puterea datelor și învață tehnici de analiză avansată.',
            'duration': '7h 20m',
            'instructor': 'Michael Roberts'
        },
        {
            'id': 'course-8',
            'title': 'Muzică și Compoziție',
            'category': 'creative',
            'tags': ['music', 'creative', 'artistic', 'relaxing', 'expressive'],
            'rating': 4.6,
            'students': 5200,
            'description': 'Învață să compui și să produci muzică de la zero.',
            'duration': '5h 30m',
            'instructor': 'James Miller'
        },
        {
            'id': 'course-9',
            'title': 'Antreprenoriat: De la Idee la Business',
            'category': 'business',
            'tags': ['business', 'achievement', 'goals', 'professional', 'intensive'],
            'rating': 4.9,
            'students': 14200,
            'description': 'Transformă-ți ideile în afaceri profitabile.',
            'duration': '6h 00m',
            'instructor': 'Anna Thompson'
        },
        {
            'id': 'course-10',
            'title': 'Yoga și Meditație',
            'category': 'featured',
            'tags': ['wellness', 'relaxing', 'gentle', 'calm', 'beginner', 'balanced'],
            'rating': 4.8,
            'students': 8900,
            'description': 'Descoperă pacea interioară prin practici de yoga și meditație.',
            'duration': '3h 15m',
            'instructor': 'Sofia Garcia'
        }
    ]


def initialize_engine():
    """Initialize the recommendation engine with courses"""
    global recommendation_engine, db_manager
    
    courses = []
    
    # Try to load courses from MongoDB first
    if MONGODB_AVAILABLE:
        try:
            from dotenv import load_dotenv
            load_dotenv('.env.ml')
            
            # Also try to load from parent directories
            import pathlib
            current_dir = pathlib.Path(__file__).parent
            backend_env = current_dir.parent.parent / 'backend' / '.env'
            if backend_env.exists():
                load_dotenv(backend_env)
            
            mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/masterclass')
            db_name = os.getenv('MONGODB_DB_NAME', 'masterclass')
            
            if mongodb_uri:
                try:
                    db_manager = MongoDBManager(mongodb_uri=mongodb_uri, db_name=db_name)
                    
                    # Try to get courses from database
                    db_courses = list(db_manager.db.courses.find({'isPublished': True}))
                    if not db_courses:
                        # Try without filter
                        db_courses = list(db_manager.db.courses.find({}))
                        
                    if db_courses:
                        for c in db_courses:
                            # Use _id as string - this is the MongoDB ObjectId
                            course_id = str(c['_id'])
                            courses.append({
                                'id': course_id,
                                'title': c.get('title', ''),
                                'category': c.get('category', ''),
                                'tags': c.get('tags', []),
                                'rating': float(c.get('rating', 4.5)),
                                'students': int(c.get('enrollmentCount', c.get('students', 0))),
                                'description': c.get('description', ''),
                                'duration': c.get('duration', '2h 0m') if isinstance(c.get('duration'), str) else f"{c.get('duration', 120) // 60}h {c.get('duration', 0) % 60}m",
                                'instructor': c.get('instructor', 'Unknown'),
                                'created_at': c.get('createdAt', c.get('created_at'))
                            })
                        logger.info(f"Loaded {len(courses)} courses from MongoDB with ObjectIds")
                        logger.info(f"Sample course IDs: {[c['id'] for c in courses[:3]]}")
                except Exception as db_err:
                    logger.warning(f"MongoDB connection error: {db_err}")
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback: Fetch courses from Node.js backend API
    if not courses:
        try:
            import requests
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:8080')
            logger.info(f"Attempting to fetch courses from backend API: {backend_url}")
            
            response = requests.get(f"{backend_url}/api/courses", timeout=5)
            if response.status_code == 200:
                data = response.json()
                api_courses = data.get('data', [])
                for c in api_courses:
                    courses.append({
                        'id': c.get('id', ''),
                        'title': c.get('title', ''),
                        'category': c.get('category', ''),
                        'tags': c.get('tags', []),
                        'rating': float(c.get('rating', 4.5)),
                        'students': int(c.get('students', 0)),
                        'description': c.get('description', ''),
                        'duration': c.get('duration', '2h 0m'),
                        'instructor': c.get('instructor', 'Unknown'),
                        'created_at': c.get('createdAt', c.get('created_at'))
                    })
                logger.info(f"Loaded {len(courses)} courses from backend API")
                logger.info(f"Sample course IDs: {[c['id'] for c in courses[:3]]}")
        except Exception as api_err:
            logger.warning(f"Could not fetch from backend API: {api_err}")
    
    # Use default courses if none loaded
    if not courses:
        courses = get_default_courses()
        logger.info(f"Using {len(courses)} default courses")
    
    # Initialize engine
    recommendation_engine = EmotionBasedRecommendationEngine()
    recommendation_engine.initialize(courses)
    
    logger.info("Recommendation engine initialized successfully")


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'engine_initialized': recommendation_engine is not None,
        'mongodb_connected': db_manager is not None
    })


@app.route('/api/recommendations', methods=['POST', 'OPTIONS'])
def get_recommendations():
    """
    Get personalized course recommendations.
    
    Request body:
    {
        "userId": "string",
        "dailyMood": {
            "mood": "felicit|motivat|relaxat|curios|productiv|creativ",
            "energy": "ridicata|medie|scazuta"
        },
        "enrolledCourses": ["course-id-1", "course-id-2"],
        "completedCourses": ["course-id-3"],
        "courseRatings": {"course-id-1": 4.5},
        "numRecommendations": 10
    }
    
    Response:
    {
        "success": true,
        "data": {
            "recommendations": [...],
            "userMood": "motivat",
            "userEnergy": "ridicata",
            "count": 10,
            "timestamp": "2025-12-26T..."
        }
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        if recommendation_engine is None:
            initialize_engine()
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Extract parameters
        num_recommendations = data.get('numRecommendations', 10)
        exclude_enrolled = data.get('excludeEnrolled', True)
        
        # Get recommendations
        recommendations = recommendation_engine.get_recommendations(
            user_data=data,
            num_recommendations=num_recommendations,
            exclude_enrolled=exclude_enrolled
        )
        
        # Get mood info
        daily_mood = data.get('dailyMood', {})
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations,
                'userMood': daily_mood.get('mood', 'curios'),
                'userEnergy': daily_mood.get('energy', 'medie'),
                'count': len(recommendations),
                'timestamp': datetime.now().isoformat()
            }
        })
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/recommendations/mood', methods=['POST', 'OPTIONS'])
def get_mood_recommendations():
    """
    Get recommendations optimized for a specific mood.
    
    Request body:
    {
        "targetMood": "motivat",
        "targetEnergy": "ridicata",
        "numRecommendations": 5
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        if recommendation_engine is None:
            initialize_engine()
        
        data = request.get_json()
        
        target_mood = data.get('targetMood', 'curios')
        target_energy = data.get('targetEnergy', 'medie')
        num_recommendations = data.get('numRecommendations', 5)
        
        # Create user data with target mood
        user_data = {
            'userId': 'mood-query',
            'dailyMood': {
                'mood': target_mood,
                'energy': target_energy
            },
            'enrolledCourses': [],
            'completedCourses': [],
            'courseRatings': {}
        }
        
        recommendations = recommendation_engine.get_recommendations(
            user_data=user_data,
            num_recommendations=num_recommendations
        )
        
        # Get category recommendations for this mood
        emotion = recommendation_engine.get_emotion_from_string(target_mood)
        mood_categories = recommendation_engine.get_mood_based_categories(emotion)
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations,
                'targetMood': target_mood,
                'targetEnergy': target_energy,
                'recommendedCategories': mood_categories[:5],
                'count': len(recommendations),
                'timestamp': datetime.now().isoformat()
            }
        })
    
    except Exception as e:
        logger.error(f"Error getting mood recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/interactions', methods=['POST', 'OPTIONS'])
def record_interaction():
    """
    Record user interaction for model improvement.
    
    Request body:
    {
        "userId": "string",
        "courseId": "string",
        "interactionType": "view|enroll|complete|rate",
        "rating": 4.5,  // optional, for rate interactions
        "mood": "motivat",  // user's mood at time of interaction
        "energy": "ridicata"
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_id = data.get('userId')
        course_id = data.get('courseId')
        interaction_type = data.get('interactionType')
        
        if not all([user_id, course_id, interaction_type]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: userId, courseId, interactionType'
            }), 400
        
        # Record interaction
        interaction = {
            'user_id': user_id,
            'course_id': course_id,
            'interaction_type': interaction_type,
            'rating': data.get('rating'),
            'mood': data.get('mood'),
            'energy': data.get('energy'),
            'timestamp': datetime.now().isoformat()
        }
        
        # Store in MongoDB if available
        if db_manager:
            try:
                db_manager.db.user_interactions.insert_one(interaction)
                logger.info(f"Recorded interaction: {user_id} - {interaction_type} - {course_id}")
            except Exception as e:
                logger.warning(f"Could not store interaction in MongoDB: {e}")
        
        # Update recommendation engine if needed
        if recommendation_engine:
            recommendation_engine.record_interaction(
                user_id=user_id,
                course_id=course_id,
                interaction_type=interaction_type,
                rating=data.get('rating')
            )
        
        return jsonify({
            'success': True,
            'data': {
                'interactionId': f"{user_id}_{course_id}_{interaction_type}",
                'timestamp': interaction['timestamp']
            }
        })
    
    except Exception as e:
        logger.error(f"Error recording interaction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/moods', methods=['GET'])
def get_available_moods():
    """Get list of available moods and energy levels"""
    return jsonify({
        'success': True,
        'data': {
            'moods': [
                {'value': 'felicit', 'label': 'Fericit', 'emoji': '😊'},
                {'value': 'motivat', 'label': 'Motivat', 'emoji': '💪'},
                {'value': 'relaxat', 'label': 'Relaxat', 'emoji': '😌'},
                {'value': 'curios', 'label': 'Curios', 'emoji': '🤔'},
                {'value': 'productiv', 'label': 'Productiv', 'emoji': '⚡'},
                {'value': 'creativ', 'label': 'Creativ', 'emoji': '🎨'}
            ],
            'energyLevels': [
                {'value': 'ridicata', 'label': 'Energie Ridicată', 'emoji': '🚀'},
                {'value': 'medie', 'label': 'Energie Medie', 'emoji': '🌟'},
                {'value': 'scazuta', 'label': 'Energie Scăzută', 'emoji': '🌙'}
            ]
        }
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    stats = {
        'engine_status': 'active' if recommendation_engine else 'inactive',
        'courses_loaded': len(recommendation_engine.courses) if recommendation_engine else 0,
        'mongodb_status': 'connected' if db_manager else 'disconnected',
        'timestamp': datetime.now().isoformat()
    }
    
    if db_manager:
        try:
            stats['total_interactions'] = db_manager.db.user_interactions.count_documents({})
            stats['total_users'] = db_manager.db.user_profiles.count_documents({})
        except:
            pass
    
    return jsonify({
        'success': True,
        'data': stats
    })


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    # Initialize engine on startup
    initialize_engine()
    
    # Get port from environment or default
    port = int(os.getenv('ML_API_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print("=" * 60)
    print("Emotion-Based Course Recommendation API Server")
    print("=" * 60)
    print(f"Server running on: http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/api/health")
    print(f"Debug mode: {debug}")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
