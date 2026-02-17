# Fix Google OAuth "Access blocked" Error 🔧

## The Problem
Error: **"Access blocked: This app's request is invalid"**

This happens when Google Cloud Console OAuth settings don't match your app configuration.

---

## Quick Fix (Step-by-Step)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if you don't have it)

### Step 2: Configure OAuth Consent Screen
1. In left menu: **APIs & Services → OAuth consent screen**
2. If NOT configured yet:
   - Choose **External** (unless you have Google Workspace)
   - Click **CREATE**
3. Fill in required fields:
   - **App name**: Social Media Automation Tool
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **SAVE AND CONTINUE**

### Step 3: Add Required Scopes
1. Click **ADD OR REMOVE SCOPES**
2. Add these scopes:
   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   ```
3. Click **UPDATE**
4. Click **SAVE AND CONTINUE**

### Step 4: Add Test Users (IMPORTANT!)
1. Click **ADD USERS**
2. Add YOUR email address (the one you'll use to login)
3. Click **ADD**
4. Click **SAVE AND CONTINUE**

**Why this matters:** If your app is in "Testing" mode, ONLY test users can connect. If you didn't add yourself, you'll get "Access blocked" error!

### Step 5: Verify OAuth Credentials
1. Go to: **APIs & Services → Credentials**
2. Click on your OAuth 2.0 Client ID
3. Check **Authorized redirect URIs** section
4. Make sure you have BOTH:
   ```
   http://localhost:3000/api/drive/callback
   http://127.0.0.1:3000/api/drive/callback
   ```
5. If missing, click **ADD URI** and add both
6. Click **SAVE**

### Step 6: Enable Google Drive API
1. Go to: **APIs & Services → Library**
2. Search for: **Google Drive API**
3. Click on it
4. Click **ENABLE** (if not already enabled)

---

## Update Your Backend Config

Open `/Users/suhani/social-media-automation/backend/.env` and verify:

```env
GOOGLE_DRIVE_CLIENT_ID=849482736171-okv27udfi6slboian0vsidqt3ijj9cmu.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=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
GOOGLE_DRIVE_REDIRECT_URI=http://127.0.0.1:3000/api/drive/callback
```

If you changed anything in Google Cloud Console, restart your backend:
```bash
cd /Users/suhani/social-media-automation/backend
npm run dev
```

---

## Test the Fix

### Option A: Test via Browser (Easiest)
1. Open your tool: http://localhost:3001
2. Login to your account
3. Go to: **Dashboard → Accounts**
4. Click **Connect Drive** button
5. You should see Google login popup
6. Select your account (the one you added as test user)
7. Click **Allow**
8. Should redirect back with "Connected ✅"

### Option B: Test via Direct URL
Visit this URL in browser:
```
http://localhost:3000/api/drive/auth?userId=YOUR_USER_ID
```
(Replace YOUR_USER_ID with your actual user ID from database)

---

## Still Getting Error?

### Error: "Access blocked: This app's request is invalid"
**Cause:** You forgot to add yourself as test user

**Fix:**
1. Go to OAuth consent screen
2. Scroll to "Test users" section
3. Click "ADD USERS"
4. Add YOUR email
5. Save and try again

### Error: "redirect_uri_mismatch"
**Cause:** Redirect URI in code doesn't match Google Cloud Console

**Fix:**
1. Check your .env file: `GOOGLE_DRIVE_REDIRECT_URI=http://127.0.0.1:3000/api/drive/callback`
2. Go to Google Cloud Console → Credentials
3. Add BOTH URIs:
   - `http://localhost:3000/api/drive/callback`
   - `http://127.0.0.1:3000/api/drive/callback`

### Error: "Google Drive API has not been used in project before"
**Cause:** Drive API not enabled

**Fix:**
1. Go to APIs & Services → Library
2. Search "Google Drive API"
3. Click ENABLE

---

## Make App Public (Optional)

If you want ANYONE to use your tool (not just test users):

1. Go to: **OAuth consent screen**
2. Click **PUBLISH APP**
3. Follow verification process (Google will review your app)

**Note:** For personal use, keeping it in Testing mode with test users is fine!

---

## Summary Checklist

Before trying again, verify:
- [ ] OAuth consent screen configured
- [ ] YOUR email added as test user
- [ ] Both redirect URIs added (localhost AND 127.0.0.1)
- [ ] Google Drive API enabled
- [ ] Scopes added (drive.readonly, drive.file)
- [ ] Backend .env has correct credentials
- [ ] Backend server restarted

---

## After Fixing OAuth

Once Drive is connected, you can:
1. Go to Videos page
2. Click "🚀 Auto Post All"
3. Enter your sheet URL:
   ```
   https://docs.google.com/spreadsheets/d/1eJFuzi-9EvqchOQ3H6cbgIUO6XEJQX4kxQZZwazg7qw/edit?usp=sharing
   ```
4. System will:
   - Import all 9:16 videos from Drive links
   - Use captions from Description column
   - Auto-publish to Instagram
   - All 100% automatic!

---

## Need Help?

If still not working after following all steps:
1. Check backend logs:
   ```bash
   tail -50 /tmp/backend-youtube-ready.log
   ```
2. Check if you're logged in with the correct Google account (the one you added as test user)
3. Try incognito mode to force fresh login
4. Clear browser cookies and try again

The most common mistake is forgetting to add yourself as a test user!
