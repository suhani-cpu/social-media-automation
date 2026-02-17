# 🔧 Troubleshooting OAuth Connection Issues

## ❌ Why It's Not Working

### The Main Problem: **No API Credentials**

When you click "Connect YouTube" or "Connect Facebook", here's what happens:

```
1. Frontend → GET /api/oauth/youtube/authorize
2. Backend tries to create OAuth URL
3. ❌ FAILS because YOUTUBE_CLIENT_ID is empty
4. Error returned to frontend
5. Connection fails
```

### What You're Seeing

- Click "Connect YouTube" → Nothing happens or error message
- Click "Connect Facebook" → Nothing happens or error message
- Backend console might show errors about missing credentials

---

## ✅ The Fix: Get API Credentials

You MUST get real API credentials from Google and Meta. Here's why:

### Without Credentials:
```env
YOUTUBE_CLIENT_ID=                    # ❌ Empty
YOUTUBE_CLIENT_SECRET=                # ❌ Empty
FACEBOOK_APP_ID=                      # ❌ Empty
FACEBOOK_APP_SECRET=                  # ❌ Empty
```

### With Credentials:
```env
YOUTUBE_CLIENT_ID=abc123...xyz         # ✅ Real value
YOUTUBE_CLIENT_SECRET=def456...uvw     # ✅ Real value
FACEBOOK_APP_ID=123456789             # ✅ Real value
FACEBOOK_APP_SECRET=abc123def456      # ✅ Real value
```

---

## 🚀 Quick Setup Guide

### Step 1: YouTube API (15 minutes)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a Project**
   - Click dropdown at top → "New Project"
   - Name: "Stage OTT Social Media"
   - Click "Create"

3. **Enable YouTube Data API**
   - Left menu → "APIs & Services" → "Library"
   - Search "YouTube Data API v3"
   - Click it → Click "Enable"

4. **Configure OAuth Consent Screen**
   - Left menu → "OAuth consent screen"
   - User Type: **External** → Click "Create"
   - Fill in:
     - App name: Stage OTT Social Media Manager
     - User support email: your email
     - Developer email: your email
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes"
     - Search: `youtube.upload`
     - Check: `https://www.googleapis.com/auth/youtube.upload`
     - Check: `https://www.googleapis.com/auth/youtube`
   - Click "Save and Continue"
   - Test users: Add your Gmail/YouTube account email
   - Click "Save and Continue"

5. **Create OAuth Credentials**
   - Left menu → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: "Stage OTT YouTube"
   - Authorized redirect URIs → Click "Add URI":
     ```
     http://localhost:3000/api/oauth/youtube/callback
     http://127.0.0.1:3000/api/oauth/youtube/callback
     ```
   - Click "Create"

6. **Copy Credentials**
   - You'll see a popup with:
     - Client ID: `123456789-abcdefg.apps.googleusercontent.com`
     - Client Secret: `GOCSPX-abc123def456`
   - **Copy both values!**

7. **Update .env File**
   ```bash
   cd backend
   nano .env  # or use VS Code
   ```

   Update these lines:
   ```env
   YOUTUBE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=GOCSPX-abc123def456
   ```

8. **Restart Backend**
   ```bash
   # Stop backend (Ctrl+C)
   npm run dev
   ```

---

### Step 2: Facebook API (15 minutes)

1. **Go to Meta for Developers**
   - Visit: https://developers.facebook.com/
   - Login with Facebook account

2. **Create an App**
   - Click "My Apps" → "Create App"
   - Use case: **Other** → Click "Next"
   - App type: **Business** → Click "Next"
   - App name: "Stage OTT Social Media Manager"
   - App contact email: your email
   - Click "Create App"

3. **Add Facebook Login Product**
   - In your app dashboard
   - Click "+ Add Product"
   - Find "Facebook Login" → Click "Set Up"
   - Choose "Web" → Enter dummy URL → Click "Save"
   - Skip the quickstart (click "Settings" in left menu under Facebook Login)

4. **Configure OAuth Settings**
   - Left menu → "Facebook Login" → "Settings"
   - Valid OAuth Redirect URIs → Add:
     ```
     http://localhost:3000/api/oauth/facebook/callback
     http://127.0.0.1:3000/api/oauth/facebook/callback
     ```
   - Click "Save Changes"

5. **Get App Credentials**
   - Left menu → "Settings" → "Basic"
   - You'll see:
     - App ID: `123456789012345`
     - App Secret: Click "Show" → `abc123def456ghi789`
   - **Copy both values!**

6. **Make Yourself a Test User**
   - Left menu → "Roles" → "Test Users"
   - Or: Left menu → "Roles" → "Administrators"
   - Add your Facebook account

7. **Request Permissions** (For testing, skip this)
   - For production, you'd request:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `publish_video`
   - But for testing, just add yourself as admin/tester

8. **Create a Facebook Page** (if you don't have one)
   - Go to: https://www.facebook.com/pages/create
   - Choose a category
   - Name your page: "Stage OTT Test Page"
   - Videos will be posted here

9. **Update .env File**
   ```bash
   cd backend
   nano .env
   ```

   Update these lines:
   ```env
   FACEBOOK_APP_ID=123456789012345
   FACEBOOK_APP_SECRET=abc123def456ghi789
   ```

10. **Restart Backend**
    ```bash
    # Stop backend (Ctrl+C)
    npm run dev
    ```

---

## 🧪 Test If It's Working

### Test 1: Check Credentials Are Loaded

```bash
cd backend
node -e "require('dotenv').config(); console.log('YouTube Client ID:', process.env.YOUTUBE_CLIENT_ID ? '✅ SET' : '❌ NOT SET'); console.log('Facebook App ID:', process.env.FACEBOOK_APP_ID ? '✅ SET' : '❌ NOT SET');"
```

Expected output:
```
YouTube Client ID: ✅ SET
Facebook App ID: ✅ SET
```

### Test 2: Check Backend API

Open your browser and go to:
- http://localhost:3000/health

Should see:
```json
{"status":"ok","timestamp":"2026-02-02T..."}
```

### Test 3: Try Connecting

1. Go to: http://localhost:3001/dashboard/accounts
2. Click "Connect YouTube"
3. You should be redirected to Google
4. Login and authorize
5. Should redirect back with success message

---

## 🔍 Common Errors & Fixes

### Error: "redirect_uri_mismatch"

**Problem:** OAuth redirect URI doesn't match

**Fix:**
1. Check your Google Cloud Console credentials
2. Make sure redirect URI is **exactly**:
   ```
   http://localhost:3000/api/oauth/youtube/callback
   ```
3. NO trailing slash, NO extra spaces
4. Check `.env` file has same URL

### Error: "invalid_client"

**Problem:** Client ID or Secret is wrong

**Fix:**
1. Double-check you copied the full Client ID and Secret
2. No extra spaces before/after
3. Make sure you saved the `.env` file
4. Restart backend after changing `.env`

### Error: "access_denied"

**Problem:** User cancelled or app doesn't have permissions

**Fix:**
1. Make sure you clicked "Allow" on Google/Facebook
2. Check OAuth consent screen has correct scopes
3. Make sure your account is added as test user

### Error: "No YouTube channel found"

**Problem:** Your Google account doesn't have a YouTube channel

**Fix:**
1. Go to https://www.youtube.com/
2. Click your profile → "Create a channel"
3. Create channel
4. Try connecting again

### Error: "No Facebook pages found"

**Problem:** Your Facebook account doesn't have any Pages

**Fix:**
1. Go to https://www.facebook.com/pages/create
2. Create a test page
3. Try connecting again

### Backend Not Starting

**Fix:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Start backend
cd backend
npm run dev
```

### Frontend Not Loading

**Fix:**
```bash
# Check if port 3001 is in use
lsof -i :3001

# Start frontend
cd frontend
npm run dev
```

---

## 📋 Checklist: Is Everything Ready?

Before trying to connect, verify:

- [ ] Backend is running (`cd backend && npm run dev`)
- [ ] Frontend is running (`cd frontend && npm run dev`)
- [ ] PostgreSQL is running
- [ ] Redis is running (optional for now)
- [ ] YouTube Client ID is set in `.env`
- [ ] YouTube Client Secret is set in `.env`
- [ ] Facebook App ID is set in `.env`
- [ ] Facebook App Secret is set in `.env`
- [ ] Backend restarted after changing `.env`
- [ ] You have a YouTube channel
- [ ] You have a Facebook Page
- [ ] You're added as test user in Facebook app

---

## 🎯 What About Instagram?

**Status:** Instagram is NOT implemented yet

**Why:** Instagram requires:
1. Facebook Business account
2. Instagram Business/Creator account
3. Instagram Graph API setup
4. More complex OAuth flow

**For now:** Focus on YouTube and Facebook. Instagram can be added later.

---

## 💡 Quick Debug Commands

### Check if backend can connect to services:

```bash
# Check database
cd backend
npx prisma studio
# Should open http://localhost:5555

# Check Redis
redis-cli ping
# Should return: PONG

# Check environment variables
cd backend
cat .env | grep -E "(YOUTUBE|FACEBOOK)"
```

### View backend logs:

```bash
cd backend
npm run dev
# Watch for errors when you click "Connect"
```

### View frontend console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Connect YouTube" or "Connect Facebook"
4. Watch for errors

---

## 🆘 Still Not Working?

### Collect Debug Info:

1. **Backend console output** (copy any errors)
2. **Frontend console output** (F12 → Console)
3. **Network tab** (F12 → Network → Try connecting → Look for failed requests)
4. **.env file** (with secrets redacted):
   ```bash
   cat backend/.env | grep -E "(YOUTUBE|FACEBOOK)" | sed 's/=.*/=***REDACTED***/'
   ```

### Then share:
- What exactly happens when you click "Connect"?
- Any error messages shown?
- Backend console logs
- Frontend console errors
- Network tab showing failed requests

---

## 📚 Additional Resources

- **YouTube Data API:** https://developers.google.com/youtube/v3
- **Facebook Graph API:** https://developers.facebook.com/docs/graph-api
- **OAuth 2.0:** https://oauth.net/2/

---

**Last Updated:** February 2, 2026
**Status:** Troubleshooting Guide
