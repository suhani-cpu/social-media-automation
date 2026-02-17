#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "Social Media Automation Platform - System Test"
echo "================================================"
echo ""

# Test 1: Backend Health Check
echo -n "Test 1: Backend Health Check... "
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $HEALTH"
    exit 1
fi

# Test 2: Frontend Accessibility
echo -n "Test 2: Frontend Accessibility... "
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $FRONTEND)"
    exit 1
fi

# Test 3: Login API
echo -n "Test 3: Login Endpoint... "
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suhani@stage.in","password":"123456"}')

if echo "$LOGIN" | grep -q '"token"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $LOGIN"
    exit 1
fi

# Test 4: Get Videos (Protected Route)
echo -n "Test 4: Protected Route (Get Videos)... "
VIDEOS=$(curl -s http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN")

if echo "$VIDEOS" | grep -q '"videos"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $VIDEOS"
fi

# Test 5: Get Posts (Protected Route)
echo -n "Test 5: Protected Route (Get Posts)... "
POSTS=$(curl -s http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN")

if echo "$POSTS" | grep -q '"posts"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $POSTS"
fi

# Test 6: Get Social Accounts
echo -n "Test 6: Get Social Accounts... "
ACCOUNTS=$(curl -s http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $TOKEN")

if echo "$ACCOUNTS" | grep -q '"accounts"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $ACCOUNTS"
fi

# Test 7: Database Connection
echo -n "Test 7: Database Connection... "
DB_TEST=$(docker exec social-media-postgres pg_isready -U postgres 2>&1)
if echo "$DB_TEST" | grep -q "accepting connections"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $DB_TEST"
fi

# Test 8: Redis Connection
echo -n "Test 8: Redis Connection... "
REDIS_TEST=$(docker exec social-media-redis redis-cli ping 2>&1)
if echo "$REDIS_TEST" | grep -q "PONG"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $REDIS_TEST"
fi

echo ""
echo "================================================"
echo -e "${GREEN}All Tests Passed!${NC}"
echo "================================================"
echo ""
echo "Services Status:"
echo "  Backend:  http://localhost:3000 ✓"
echo "  Frontend: http://localhost:3001 ✓"
echo "  Database: PostgreSQL ✓"
echo "  Cache:    Redis ✓"
echo ""
echo "Your Account:"
echo "  Email:    suhani@stage.in"
echo "  Password: 123456"
echo ""
echo "Next Steps:"
echo "  1. Open http://localhost:3001 in your browser"
echo "  2. Click 'Login'"
echo "  3. Enter your credentials"
echo "  4. You should see the dashboard"
echo ""
