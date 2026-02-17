#!/bin/bash

echo "================================================"
echo "Social Media Automation Platform"
echo "Quick Start Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}What would you like to do?${NC}"
echo ""
echo "1. Start Development Environment (Recommended for first time)"
echo "2. Start with Docker (Full stack with database)"
echo "3. View Project Documentation"
echo "4. Check Prerequisites"
echo "5. Run Tests"
echo "6. Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo ""
    echo -e "${GREEN}Starting Development Environment...${NC}"
    echo ""
    echo "This will start:"
    echo "  - Backend API (http://localhost:3000)"
    echo "  - Frontend Dashboard (http://localhost:3001)"
    echo ""
    echo -e "${YELLOW}Make sure you have:${NC}"
    echo "  - Node.js 20+ installed"
    echo "  - PostgreSQL running"
    echo "  - Redis running"
    echo "  - Configured .env files"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    # Check if in project root
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: Please run this script from the project root${NC}"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing root dependencies..."
        npm install
    fi
    
    # Backend setup
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm install
    fi
    
    if [ ! -f ".env" ]; then
        echo "Creating backend .env file..."
        cp .env.example .env
        echo -e "${YELLOW}Please edit backend/.env with your settings${NC}"
        exit 1
    fi
    
    echo "Generating Prisma Client..."
    npx prisma generate
    
    # Frontend setup
    cd ../frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    if [ ! -f ".env.local" ]; then
        echo "Creating frontend .env.local file..."
        cp .env.local.example .env.local
    fi
    
    cd ..
    
    echo ""
    echo -e "${GREEN}Starting services...${NC}"
    echo ""
    echo "Open these URLs:"
    echo "  - Frontend: http://localhost:3001"
    echo "  - Backend: http://localhost:3000"
    echo "  - API Health: http://localhost:3000/health"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""
    
    # Start all services
    npm run dev
    ;;
    
  2)
    echo ""
    echo -e "${GREEN}Starting with Docker...${NC}"
    echo ""
    echo "This will start all services in Docker containers"
    echo ""
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed!${NC}"
        echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your settings${NC}"
        exit 1
    fi
    
    echo "Starting Docker containers..."
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:3001"
    echo "  - Backend: http://localhost:3000"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    ;;
    
  3)
    echo ""
    echo -e "${GREEN}Documentation Files:${NC}"
    echo ""
    echo "1. README.md - Project overview and features"
    echo "2. QUICK_START.md - Get started in 5 minutes"
    echo "3. DEPLOYMENT.md - Production deployment guide"
    echo "4. TESTING.md - Testing guide"
    echo "5. PROJECT_SUMMARY.md - Complete project summary"
    echo ""
    read -p "Enter number to view (or press Enter to skip): " doc_choice
    
    case $doc_choice in
      1) cat README.md | less ;;
      2) cat QUICK_START.md | less ;;
      3) cat DEPLOYMENT.md | less ;;
      4) cat TESTING.md | less ;;
      5) cat PROJECT_SUMMARY.md | less ;;
    esac
    ;;
    
  4)
    echo ""
    echo -e "${GREEN}Checking Prerequisites...${NC}"
    echo ""
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
    else
        echo -e "${RED}✗${NC} Node.js: Not installed (Required: 20+)"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
    else
        echo -e "${RED}✗${NC} npm: Not installed"
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        echo -e "${GREEN}✓${NC} Docker: $DOCKER_VERSION"
    else
        echo -e "${YELLOW}⚠${NC} Docker: Not installed (Optional, but recommended)"
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version)
        echo -e "${GREEN}✓${NC} PostgreSQL: $PSQL_VERSION"
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL: Not found (Can use Docker instead)"
    fi
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis: Installed"
    else
        echo -e "${YELLOW}⚠${NC} Redis: Not found (Can use Docker instead)"
    fi
    
    # Check FFmpeg
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version | head -n1)
        echo -e "${GREEN}✓${NC} FFmpeg: $FFMPEG_VERSION"
    else
        echo -e "${RED}✗${NC} FFmpeg: Not installed (Required for video processing)"
        echo "    Install: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)"
    fi
    
    echo ""
    ;;
    
  5)
    echo ""
    echo -e "${GREEN}Running Tests...${NC}"
    echo ""
    echo "1. Run all tests"
    echo "2. Run backend tests only"
    echo "3. Run frontend tests only"
    echo "4. Run with coverage"
    echo ""
    read -p "Enter your choice (1-4): " test_choice
    
    case $test_choice in
      1)
        echo "Running all tests..."
        cd backend && npm test && cd ../frontend && npm test && cd ..
        ;;
      2)
        echo "Running backend tests..."
        cd backend && npm test && cd ..
        ;;
      3)
        echo "Running frontend tests..."
        cd frontend && npm test && cd ..
        ;;
      4)
        echo "Running tests with coverage..."
        cd backend && npm test -- --coverage && cd ../frontend && npm test -- --coverage && cd ..
        ;;
    esac
    ;;
    
  6)
    echo ""
    echo "Goodbye!"
    exit 0
    ;;
    
  *)
    echo ""
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac
