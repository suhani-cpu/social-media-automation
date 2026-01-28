#!/bin/bash

# Social Media Automation - Automated Setup Script
# Double-click ya terminal mein run karo: bash setup.sh

set -e  # Stop on errors

echo "🚀 Social Media Automation - Automated Setup Starting..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js not found!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "${RED}❌ Docker not found!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "${GREEN}✅ Node.js found: $(node --version)${NC}"
echo "${GREEN}✅ Docker found: $(docker --version)${NC}"
echo ""

# Step 2: Start database
echo "${BLUE}Step 2: Starting PostgreSQL database...${NC}"
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

echo "${GREEN}✅ Database started!${NC}"
echo ""

# Step 3: Install backend dependencies
echo "${BLUE}Step 3: Installing backend dependencies...${NC}"
cd backend
npm install

echo "${GREEN}✅ Dependencies installed!${NC}"
echo ""

# Step 4: Setup database
echo "${BLUE}Step 4: Setting up database tables...${NC}"
npm run prisma:generate
npm run prisma:migrate

echo "${GREEN}✅ Database setup complete!${NC}"
echo ""

# Step 5: Create test user
echo "${BLUE}Step 5: Creating test user...${NC}"
echo "Starting server temporarily..."

# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 10

# Register test user
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suhani@stageott.com",
    "password": "Stage@123",
    "name": "Suhani"
  }')

# Extract token
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Stop server
kill $SERVER_PID 2>/dev/null || true
sleep 2

echo "${GREEN}✅ Test user created!${NC}"
echo ""
echo "📧 Email: suhani@stageott.com"
echo "🔑 Password: Stage@123"
echo ""
echo "🎫 Your Access Token (save this!):"
echo "$TOKEN"
echo ""
echo "$TOKEN" > ../USER_TOKEN.txt
echo "${GREEN}Token saved to: USER_TOKEN.txt${NC}"
echo ""

# Step 6: Final instructions
echo "${GREEN}========================================${NC}"
echo "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the server:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Server will run at: http://localhost:3000"
echo ""
echo "3. Your login credentials:"
echo "   Email: suhani@stageott.com"
echo "   Password: Stage@123"
echo ""
echo "4. Your access token saved in: USER_TOKEN.txt"
echo ""
echo "5. Follow QUICKSTART.md for Instagram setup"
echo ""
echo "Need help? Check README.md or API-EXAMPLES.md"
echo ""
echo "${GREEN}Happy Posting! 🎬✨${NC}"
