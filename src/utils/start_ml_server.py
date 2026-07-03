"""
Start the Emotion-Based ML Recommendation API Server
====================================================
This script starts the Flask API server for course recommendations.

Usage:
    python start_ml_server.py [--port PORT] [--debug]

Example:
    python start_ml_server.py --port 5001 --debug
"""

import os
import sys
import argparse

# Add the directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    parser = argparse.ArgumentParser(description='Start ML Recommendation API Server')
    parser.add_argument('--port', type=int, default=5001, help='Port to run the server on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    args = parser.parse_args()
    
    # Set environment variables
    os.environ['ML_API_PORT'] = str(args.port)
    os.environ['FLASK_DEBUG'] = 'true' if args.debug else 'false'
    
    print("=" * 60)
    print("Emotion-Based ML Recommendation Server")
    print("=" * 60)
    print(f"Starting server on port {args.port}...")
    print(f"Debug mode: {args.debug}")
    print()
    
    # Check for TensorFlow
    try:
        import tensorflow as tf
        print(f"✓ TensorFlow {tf.__version__} loaded")
    except ImportError:
        print("⚠ TensorFlow not available - using rule-based fallback")
    
    # Check for MongoDB
    try:
        from pymongo import MongoClient
        print("✓ PyMongo available")
    except ImportError:
        print("⚠ PyMongo not available - using default courses")
    
    print()
    print("=" * 60)
    
    # Import and run the API
    from emotion_recommendation_api import app, initialize_engine
    
    # Initialize engine
    initialize_engine()
    
    # Run server
    app.run(
        host='0.0.0.0',
        port=args.port,
        debug=args.debug
    )


if __name__ == '__main__':
    main()
