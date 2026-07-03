@echo off
echo ============================================
echo Starting StreamClass Full Application
echo ============================================
echo.

:: Start ML Server in background
echo [1/3] Starting ML Recommendation Server on port 5001...
start "ML-Server" cmd /c "cd /d %~dp0\src\utils && python start_ml_server.py --port 5001"
timeout /t 3 /nobreak > nul

:: Start Backend Server in background
echo [2/3] Starting Backend Server on port 8080...
start "Backend-Server" cmd /c "cd /d %~dp0\backend && npm start"
timeout /t 3 /nobreak > nul

:: Start Frontend Dev Server
echo [3/3] Starting Frontend on port 3000...
echo.
echo ============================================
echo All servers starting...
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:8080
echo   - ML API: http://localhost:5001
echo ============================================
echo.
npm run dev:frontend
