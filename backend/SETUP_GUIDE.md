#!/bin/bash

# MasterClass Backend - Startup Instructions

clear

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     MasterClass Backend - Setup & Launch Guide              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "📋 Checking prerequisites..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"
echo ""

# Check MongoDB
echo "🔍 Checking MongoDB Atlas connection..."
echo "   Make sure you have:"
echo "   - MongoDB Atlas account"
echo "   - IP whitelist updated"
echo "   - Connection string in .env"
echo ""

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "                     STARTUP INSTRUCTIONS"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣  FIRST TIME SETUP:"
echo ""
echo "   a) Configure .env file:"
echo "      - Update MONGODB_URI with your MongoDB Atlas connection"
echo "      - Set JWT_SECRET to a secure random string"
echo "      - Verify ML_API_URL=http://localhost:5001/api"
echo ""
echo "   b) Seed the database with sample courses:"
echo "      $ node seed.js"
echo ""
echo "   c) Start the server:"
echo "      $ npm run dev"
echo ""

echo "2️⃣  SUBSEQUENT RUNS:"
echo ""
echo "   Just start the backend:"
echo "      $ npm run dev"
echo ""

echo "3️⃣  EXPECTED OUTPUT:"
echo ""
echo "   ✓ MongoDB connected"
echo "   ✓ Server running on http://localhost:5000"
echo "   ✓ ML API integration ready (connects to :5001)"
echo ""

echo "4️⃣  API ENDPOINTS (Test with curl or Postman):"
echo ""
echo "   Health Check:"
echo "   $ curl http://localhost:5000/api/health"
echo ""
echo "   Register:"
echo "   $ curl -X POST http://localhost:5000/api/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"tudor\",\"email\":\"tudor@test.com\",\"password\":\"pass123\"}'"
echo ""
echo "   Login:"
echo "   $ curl -X POST http://localhost:5000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"tudor@test.com\",\"password\":\"pass123\",\"emotion\":\"MOTIVAT\"}'"
echo ""

echo "5️⃣  FRONTEND INTEGRATION:"
echo ""
echo "   Copy these files to src/utils/ in your React app:"
echo "   - backend/backendApiService.js"
echo "   - backend/useBackendHooks.js"
echo ""
echo "   Set environment variable in .env:"
echo "   REACT_APP_API_URL=http://localhost:5000/api"
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""
echo "📚 Documentation:"
echo "   - backend/README.md           (Full API documentation)"
echo "   - FRONTEND_INTEGRATION.md     (React integration guide)"
echo ""

echo "⚡ Ready to start? Run:"
echo ""
echo "   npm run dev"
echo ""
