#!/bin/bash

# Quick Start Server Script
# Double-click to start the server!

cd "$(dirname "$0")/backend"

echo "🚀 Starting Social Media Automation Server..."
echo ""
echo "Server will start at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
