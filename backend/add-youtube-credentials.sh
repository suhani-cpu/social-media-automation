#!/bin/bash

echo "=================================="
echo "YouTube Credentials Setup"
echo "=================================="
echo ""

# Get current directory
BACKEND_DIR="/Users/suhani/social-media-automation/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo "📝 Google Cloud Console se credentials copy kar lo:"
echo ""
echo "1. Client ID copy karo"
echo "2. Neeche paste karo jab prompt mile"
echo ""

# Read Client ID
read -p "YouTube Client ID paste karo: " CLIENT_ID

echo ""
echo "3. Client Secret copy karo"
echo "4. Neeche paste karo jab prompt mile"
echo ""

# Read Client Secret (hidden input for security)
read -p "YouTube Client Secret paste karo: " CLIENT_SECRET

echo ""
echo "=================================="
echo "✅ Credentials received!"
echo "=================================="

# Backup existing .env
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"

# Update .env file
sed -i '' "s|^YOUTUBE_CLIENT_ID=.*|YOUTUBE_CLIENT_ID=$CLIENT_ID|g" "$ENV_FILE"
sed -i '' "s|^YOUTUBE_CLIENT_SECRET=.*|YOUTUBE_CLIENT_SECRET=$CLIENT_SECRET|g" "$ENV_FILE"

echo ""
echo "✅ Credentials successfully added to .env file!"
echo ""
echo "Verifying..."
echo ""

# Verify (show first 30 chars only for security)
CLIENT_ID_CHECK=$(grep "^YOUTUBE_CLIENT_ID=" "$ENV_FILE" | cut -c1-40)
CLIENT_SECRET_CHECK=$(grep "^YOUTUBE_CLIENT_SECRET=" "$ENV_FILE" | cut -c1-40)

echo "YOUTUBE_CLIENT_ID: ${CLIENT_ID_CHECK}..."
echo "YOUTUBE_CLIENT_SECRET: ${CLIENT_SECRET_CHECK}..."

echo ""
echo "=================================="
echo "🎉 Setup Complete!"
echo "=================================="
echo ""
echo "Ab backend restart karo:"
echo "  cd backend && npm run dev"
echo ""
