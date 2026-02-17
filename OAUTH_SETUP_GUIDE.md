# 🔐 OAuth Apps Setup Guide - Social Media Automation

**Date**: 2026-02-03
**Purpose**: Complete step-by-step guide to setup OAuth apps for YouTube, Facebook, and Instagram

---

## 📋 Prerequisites

Before starting, make sure you have:
- [ ] Google account (for YouTube)
- [ ] Facebook account (for Facebook & Instagram)
- [ ] Instagram Business account (linked to Facebook Page)
- [ ] Backend running on `http://localhost:3000`
- [ ] Frontend running on `http://localhost:3001`

---

## 1️⃣ YouTube OAuth Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Login with your Google account

2. **Create New Project**
   - Click "Select a project" → "New Project"
   - Project Name: `Social Media Automation` (or any name)
   - Click "Create"
   - Wait for project creation (1-2 minutes)

3. **Select Your Project**
   - Click "Select a project" → Choose your newly created project

### Step 2: Enable YouTube Data API

1. **Go to API Library**
   - Click "☰" menu → "APIs & Services" → "Library"
   - Or visit: https://console.cloud.google.com/apis/library

2. **Search and Enable YouTube API**
   - Search for: `YouTube Data API v3`
   - Click on it
   - Click "Enable" button
   - Wait for activation (few seconds)

### Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Click "☰" menu → "APIs & Services" → "OAuth consent screen"
   - Or visit: https://console.cloud.google.com/apis/credentials/consent

2. **Choose User Type**
   - Select: **External** (for testing with any Google account)
   - Click "Create"

3. **Fill App Information**
   - **App name**: `Social Media Automation`
   - **User support email**: Your email
   - **Developer contact email**: Your email
   - **App logo**: (Optional - skip for now)
   - Click "Save and Continue"

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Search and select these scopes:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube`
   - Click "Update"
   - Click "Save and Continue"

5. **Add Test Users** (Important for External apps)
   - Click "Add Users"
   - Add your Google email address
   - Click "Add"
   - Click "Save and Continue"

6. **Review and Finish**
   - Review all information
   - Click "Back to Dashboard"

### Step 4: Create OAuth Credentials

1. **Go to Credentials**
   - Click "☰" menu → "APIs & Services" → "Credentials"
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client ID**
   - Click "Create Credentials" → "OAuth client ID"

3. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: `Social Media Automation - Web Client`

4. **Add Authorized Redirect URIs**
   - Click "Add URI" under "Authorized redirect URIs"
   - Add: `http://localhost:3000/api/oauth/youtube/callback`
   - (For production, add your domain: `https://yourdomain.com/api/oauth/youtube/callback`)

5. **Create**
   - Click "Create"
   - You'll see a popup with credentials

6. **Copy Credentials** ⚠️ IMPORTANT
   - **Client ID**: Copy this (looks like: `123456789-abcdefgh.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx`)
   - Save these in a secure place!

### ✅ YouTube Setup Complete!

Save these credentials:
```
YOUTUBE_CLIENT_ID=<your-client-id>
YOUTUBE_CLIENT_SECRET=<your-client-secret>
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback
```

---

## 2️⃣ Facebook OAuth Setup

### Step 1: Create Facebook App

1. **Go to Meta for Developers**
   - Visit: https://developers.facebook.com/
   - Login with your Facebook account

2. **Create New App**
   - Click "My Apps" → "Create App"
   - Or visit: https://developers.facebook.com/apps/create/

3. **Choose App Type**
   - Select: **Business** (or **Consumer** if Business is not available)
   - Click "Next"

4. **Fill App Details**
   - **App Name**: `Social Media Automation`
   - **App Contact Email**: Your email
   - Click "Create App"
   - Complete security check if prompted

### Step 2: Configure App Settings

1. **Go to App Dashboard**
   - You'll be redirected to your app dashboard
   - Note your **App ID** (top left)

2. **Get App Secret**
   - Click "Settings" → "Basic" (left sidebar)
   - Find "App Secret"
   - Click "Show" → Enter your Facebook password
   - **Copy App Secret** and save it securely

3. **Add App Domain**
   - Scroll to "App Domains"
   - Add: `localhost`
   - Click "Save Changes" (bottom)

### Step 3: Add Facebook Login Product

1. **Add Product**
   - Click "Add Product" (left sidebar)
   - Find "Facebook Login"
   - Click "Set Up"

2. **Choose Platform**
   - Select "Web"
   - Site URL: `http://localhost:3001`
   - Click "Save" → "Continue"

3. **Configure OAuth Settings**
   - Click "Facebook Login" → "Settings" (left sidebar)
   - Find "Valid OAuth Redirect URIs"
   - Add: `http://localhost:3000/api/oauth/facebook/callback`
   - Click "Save Changes"

### Step 4: Request Permissions

1. **Go to App Review**
   - Click "App Review" → "Permissions and Features"

2. **Request Advanced Access** (for production)
   - For testing, you can use Standard Access
   - Required permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`
     - `pages_read_user_content`

3. **For Testing** (Skip App Review)
   - Add yourself as a Test User
   - Go to "Roles" → "Test Users"
   - Add test user

### Step 5: Add Facebook Pages API

1. **Add Pages Product**
   - If not already added, go to "Add Product"
   - Find "Facebook Pages API"
   - Click "Set Up"

### ✅ Facebook Setup Complete!

Save these credentials:
```
FACEBOOK_APP_ID=<your-app-id>
FACEBOOK_APP_SECRET=<your-app-secret>
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
```

---

## 3️⃣ Instagram OAuth Setup

**Note**: Instagram OAuth uses Facebook's authentication. You need the same Facebook App.

### Step 1: Add Instagram Product

1. **Go to Your Facebook App Dashboard**
   - Visit: https://developers.facebook.com/apps/
   - Select your app

2. **Add Instagram Product**
   - Click "Add Product"
   - Find "Instagram Basic Display"
   - Click "Set Up"

### Step 2: Create Instagram App

1. **Create Instagram App**
   - Scroll to "Instagram Basic Display"
   - Click "Create New App"
   - Enter App Name: `Social Media Automation`
   - Click "Create App"

2. **Configure OAuth Settings**
   - **Valid OAuth Redirect URIs**: `http://localhost:3000/api/oauth/instagram/callback`
   - **Deauthorize Callback URL**: `http://localhost:3000/api/oauth/instagram/deauthorize`
   - **Data Deletion Request URL**: `http://localhost:3000/api/oauth/instagram/delete`
   - Click "Save Changes"

3. **Get Instagram Credentials**
   - **Instagram App ID**: Copy this
   - **Instagram App Secret**: Click "Show" → Copy this
   - Save these securely

### Step 3: Add Instagram Tester

1. **Add Instagram Test User**
   - Scroll to "User Token Generator"
   - Click "Add or Remove Instagram Testers"
   - Opens Instagram → Settings → Apps and Websites → Tester Invites
   - Accept the invite

### Step 4: Use Instagram Graph API (Better Option)

**Note**: For better functionality (posting, analytics), use Instagram Graph API instead of Basic Display.

1. **Requirements**:
   - Instagram Business Account (not Personal)
   - Instagram account must be linked to a Facebook Page
   - Facebook Page must be connected to your Facebook App

2. **Setup**:
   - Use the same Facebook App credentials
   - Instagram Graph API uses Facebook OAuth
   - No separate Instagram credentials needed

### ✅ Instagram Setup Complete!

**Option 1: Basic Display API** (Limited features)
```
INSTAGRAM_APP_ID=<your-instagram-app-id>
INSTAGRAM_APP_SECRET=<your-instagram-app-secret>
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback
```

**Option 2: Graph API** (Recommended - Full features)
```
# Use Facebook credentials
# Instagram auth will work through Facebook OAuth
INSTAGRAM_APP_ID=<same-as-facebook-app-id>
INSTAGRAM_APP_SECRET=<same-as-facebook-app-secret>
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback
```

---

## 4️⃣ Configure Backend Environment

### Step 1: Update .env File

1. **Open Backend .env**
   ```bash
   cd /Users/suhani/social-media-automation/backend
   nano .env
   ```

2. **Add OAuth Credentials**
   ```env
   # YouTube OAuth
   YOUTUBE_CLIENT_ID=your-youtube-client-id
   YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
   YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

   # Facebook OAuth
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

   # Instagram OAuth (use Facebook credentials for Graph API)
   INSTAGRAM_APP_ID=your-facebook-app-id
   INSTAGRAM_APP_SECRET=your-facebook-app-secret
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback
   ```

3. **Save and Exit**
   - Press `Ctrl + X` → `Y` → `Enter`

### Step 2: Restart Backend

```bash
# Stop current backend (if running)
# Then restart
cd backend
npm run dev
```

---

## 5️⃣ Test OAuth Connections

### Test YouTube Connection

1. **Open Accounts Page**
   - Visit: http://localhost:3001/dashboard/accounts

2. **Click "Connect YouTube"**
   - You'll be redirected to Google login
   - Login with your test user account
   - Grant permissions
   - You'll be redirected back with success message

3. **Verify Connection**
   - Check if YouTube account appears in "Connected Accounts"
   - Status should be "Active"

### Test Facebook Connection

1. **Click "Connect Facebook"**
   - Login to Facebook
   - Select which Pages to connect
   - Grant permissions
   - Redirect back with success message

2. **Verify Connection**
   - All selected Facebook Pages should appear
   - Status should be "Active"

### Test Instagram Connection

1. **Click "Connect Instagram"**
   - Login to Facebook (Instagram uses Facebook OAuth)
   - Grant Instagram permissions
   - Select Instagram Business accounts
   - Redirect back with success message

2. **Verify Connection**
   - Instagram accounts should appear
   - Status should be "Active"

---

## 🔍 Troubleshooting

### YouTube Issues

**Error: "redirect_uri_mismatch"**
- Check redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/oauth/youtube/callback`
- No trailing slash
- Correct protocol (http for localhost)

**Error: "Access blocked: This app's request is invalid"**
- Consent screen not configured properly
- Add yourself as a test user
- Make sure scopes are added

**Error: "Access blocked: Authorization Error"**
- App not published (keep it in Testing mode)
- You're not added as a test user

### Facebook Issues

**Error: "Can't Load URL"**
- Check redirect URI in Facebook Login settings
- Make sure "Valid OAuth Redirect URIs" includes: `http://localhost:3000/api/oauth/facebook/callback`

**Error: "App Not Setup"**
- Facebook Login product not added
- Check Products in left sidebar

**Error: "No Facebook Pages Found"**
- Create a Facebook Page first
- Make sure you're admin of the page

### Instagram Issues

**Error: "No Instagram Business Accounts Found"**
- Convert Instagram account to Business
- Link Instagram to Facebook Page
- Make sure Facebook Page is connected to app

**Error: "Invalid Redirect URI"**
- Check Instagram Basic Display settings
- Verify redirect URI matches exactly

---

## 📝 Quick Reference

### Required URLs

**Google Cloud Console**: https://console.cloud.google.com/
**Meta Developers**: https://developers.facebook.com/
**Your Accounts Page**: http://localhost:3001/dashboard/accounts

### Redirect URIs

```
YouTube:  http://localhost:3000/api/oauth/youtube/callback
Facebook: http://localhost:3000/api/oauth/facebook/callback
Instagram: http://localhost:3000/api/oauth/instagram/callback
```

### Required Permissions

**YouTube:**
- youtube.upload
- youtube.readonly
- youtube

**Facebook:**
- pages_show_list
- pages_read_engagement
- pages_manage_posts
- pages_read_user_content

**Instagram:**
- instagram_basic (Basic Display API)
- instagram_content_publish (Graph API)
- instagram_manage_insights (Graph API)

---

## ✅ Checklist

- [ ] YouTube OAuth app created
- [ ] YouTube API enabled
- [ ] YouTube credentials copied
- [ ] Facebook app created
- [ ] Facebook Login configured
- [ ] Facebook credentials copied
- [ ] Instagram product added
- [ ] Instagram credentials configured
- [ ] All credentials added to .env
- [ ] Backend restarted
- [ ] YouTube connection tested
- [ ] Facebook connection tested
- [ ] Instagram connection tested

---

## 🎯 Next Steps

After successful OAuth setup:

1. **Test Video Upload**
   - Upload a test video
   - Check video processing

2. **Create Test Post**
   - Create post for connected accounts
   - Test scheduling

3. **Test Publishing**
   - Publish to YouTube
   - Publish to Facebook
   - Publish to Instagram

4. **Check Analytics**
   - Wait for posts to publish
   - Check analytics dashboard

---

**Need Help?**

If you encounter issues:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Check browser console for errors
3. Verify all credentials are correct
4. Make sure all redirect URIs match exactly
5. Ensure test users are added (for development)

---

**Last Updated**: 2026-02-03
