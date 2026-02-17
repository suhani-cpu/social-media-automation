#!/bin/bash

echo "=========================================="
echo "Stage OTT Social Media Automation"
echo "Final Testing & Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 22+${NC}"
    exit 1
fi

# Check PostgreSQL
echo ""
echo "2️⃣  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found in PATH${NC}"
fi

# Check FFmpeg
echo ""
echo "3️⃣  Checking FFmpeg (Required for video editing)..."
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
    echo -e "${GREEN}✓ FFmpeg installed: $FFMPEG_VERSION${NC}"
else
    echo -e "${RED}✗ FFmpeg NOT installed${NC}"
    echo -e "${YELLOW}   Video editing features will NOT work!${NC}"
    echo -e "${YELLOW}   Install with: brew install ffmpeg${NC}"
fi

# Check if backend dependencies are installed
echo ""
echo "4️⃣  Checking backend dependencies..."
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
echo ""
echo "5️⃣  Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Check environment files
echo ""
echo "6️⃣  Checking environment configuration..."
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ Backend .env found${NC}"
else
    echo -e "${RED}✗ Backend .env missing${NC}"
    echo -e "${YELLOW}   Copy backend/.env.example to backend/.env and configure${NC}"
fi

if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✓ Frontend .env.local found${NC}"
else
    echo -e "${YELLOW}⚠ Frontend .env.local missing (optional)${NC}"
fi

# Check if database is running
echo ""
echo "7️⃣  Checking database connection..."
cd backend
if npx prisma db push --skip-generate &> /dev/null; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}   Make sure PostgreSQL is running and DATABASE_URL is configured${NC}"
fi
cd ..

# Kill existing processes
echo ""
echo "8️⃣  Stopping existing processes..."
lsof -t -i:3000 | xargs kill -9 2>/dev/null
lsof -t -i:3001 | xargs kill -9 2>/dev/null
echo -e "${GREEN}✓ Cleaned up old processes${NC}"

# Start backend
echo ""
echo "9️⃣  Starting backend server..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
cd ..

# Wait for backend to start
echo "   Waiting for backend to be ready..."
sleep 5

# Check backend health
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}   Check logs/backend.log for errors${NC}"
fi

# Start frontend
echo ""
echo "🔟 Starting frontend server..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..

# Wait for frontend to start
echo "   Waiting for frontend to be ready..."
sleep 8

# Check frontend
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    echo -e "${YELLOW}   Check logs/frontend.log for errors${NC}"
fi

echo ""
echo "=========================================="
echo "🚀 Application is running!"
echo "=========================================="
echo ""
echo "📍 Frontend: http://localhost:3001"
echo "📍 Backend API: http://localhost:3000/api"
echo "📍 Health Check: http://localhost:3000/health"
echo ""
echo "📋 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   OR"
echo "   lsof -t -i:3000 | xargs kill -9"
echo "   lsof -t -i:3001 | xargs kill -9"
echo ""
echo "=========================================="
echo "✅ READY FOR TESTING"
echo "=========================================="
echo ""
echo "Test Credentials:"
echo "   Email: suhani@stage.in"
echo "   Password: 123456"
echo ""
echo "Test Flow:"
echo "1. Login at http://localhost:3001/login"
echo "2. Upload video at Dashboard → Videos → Upload"
echo "3. Create post at Dashboard → Posts → Create Post"
echo "4. Edit video at Dashboard → Videos → [Video] → Edit"
echo ""
