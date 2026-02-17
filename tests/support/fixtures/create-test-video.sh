#!/bin/bash

# Script to create test video files
# This script creates minimal test videos for E2E testing

echo "Creating test video files..."

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not installed. Install with:"
    echo "   brew install ffmpeg"
    exit 1
fi

# Create small test video (3 seconds, ~100KB)
echo "📹 Creating small test video (test-video.mp4)..."
ffmpeg -f lavfi -i testsrc=duration=3:size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:duration=3 \
  -pix_fmt yuv420p -c:v libx264 -preset ultrafast -c:a aac -shortest \
  -y "$(dirname "$0")/test-video.mp4" \
  -loglevel error

if [ $? -eq 0 ]; then
    echo "✅ test-video.mp4 created successfully"
    ls -lh "$(dirname "$0")/test-video.mp4"
else
    echo "❌ Failed to create test-video.mp4"
    exit 1
fi

# Optionally create large test video for size limit tests
read -p "Create large test video for size limit tests? (y/N): " response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "📹 Creating large test video (large-video.mp4)..."
    ffmpeg -f lavfi -i testsrc=duration=180:size=1920x1080:rate=30 \
      -f lavfi -i sine=frequency=1000:duration=180 \
      -pix_fmt yuv420p -c:v libx264 -b:v 50M -c:a aac \
      -y "$(dirname "$0")/large-video.mp4" \
      -loglevel error

    if [ $? -eq 0 ]; then
        echo "✅ large-video.mp4 created successfully"
        ls -lh "$(dirname "$0")/large-video.mp4"
    else
        echo "❌ Failed to create large-video.mp4"
    fi
fi

echo ""
echo "✅ Test video setup complete!"
echo "Test videos are ready in: tests/support/fixtures/"
