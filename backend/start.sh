#!/bin/bash

# MasterClass Backend Startup Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  MasterClass Backend - Startup Script                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✓ Dependencies ready"
echo ""
echo "Available commands:"
echo ""
echo "  npm start       - Start production server"
echo "  npm run dev     - Start development server with nodemon"
echo "  node seed.js    - Seed database with sample courses"
echo ""
echo "Environment Variables:"
echo "  - BACKEND_PORT=5000 (default)"
echo "  - MONGODB_URI=mongodb+srv://... (required)"
echo "  - JWT_SECRET=... (required)"
echo "  - ML_API_URL=http://localhost:5001/api (for Python integration)"
echo ""
echo "Starting backend in development mode..."
echo ""

npm run dev
