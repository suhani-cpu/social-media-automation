# Quick Google Drive Setup (5 Minutes) ⚡

## You Need To Do These Steps (I Can't Do It For You)

**Why?** Google OAuth credentials are tied to YOUR Google account. Only you can create them.

---

## Step 1: Go to Google Cloud Console

**Link:** https://console.cloud.google.com/

1. Click the link above
2. Sign in with your Google account
3. You'll see the Google Cloud Console dashboard

---

## Step 2: Create a New Project

1. Click the **project dropdown** at the top (says "Select a project")
2. Click **"NEW PROJECT"** button (top right)
3. Enter project name: **"Social Media Automation"**
4. Click **"CREATE"**
5. Wait 10 seconds for it to create
6. Make sure the new project is selected (check top bar)

---

## Step 3: Enable Google Drive API

1. In the left menu, go to: **APIs & Services** → **Library**
2. In the search box, type: **"Google Drive API"**
3. Click on **"Google Drive API"**
4. Click the blue **"ENABLE"** button
5. Wait for it to enable (5 seconds)

---

## Step 4: Configure OAuth Consent Screen

1. In the left menu, go to: **APIs & Services** → **OAuth consent screen**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"CREATE"**

**Fill in the form:**
- **App name:** Social Media Automation
- **User support email:** (select your email from dropdown)
- **Developer contact email:** (type your email)
- Click **"SAVE AND CONTINUE"**

**Scopes page:**
- Click **"ADD OR REMOVE SCOPES"**
- Search for: **"drive.file"**
- Check the box for: **.../auth/drive.file**
- Search for: **"drive.readonly"**
- Check the box for: **.../auth/drive.readonly**
- Click **"UPDATE"**
- Click **"SAVE AND CONTINUE"**

**Test users page:**
- Click **"ADD USERS"**
- Enter your email address
- Click **"ADD"**
- Click **"SAVE AND CONTINUE"**

**Summary page:**
- Click **"BACK TO DASHBOARD"**

---

## Step 5: Create OAuth Credentials

1. In the left menu, go to: **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** (at the top)
3. Select **"OAuth client ID"**

**Fill in the form:**
- **Application type:** Web application
- **Name:** Social Media Automation Backend
- **Authorized redirect URIs:** Click **"+ ADD URI"**
  - Enter: `http://localhost:3000/api/drive/callback`
  - Click **"ADD URI"** again
  - Enter: `http://localhost:3001/dashboard/accounts` (optional, for frontend)
- Click **"CREATE"**

---

## Step 6: Copy Your Credentials

**You'll see a popup with:**
- **Client ID** (looks like: 123456789-abc123.apps.googleusercontent.com)
- **Client Secret** (looks like: GOCSPX-abc123xyz)

**IMPORTANT:** Keep this window open or click **"DOWNLOAD JSON"** to save them!

---

## Step 7: Add Credentials to .env File

1. Open: `/Users/suhani/social-media-automation/backend/.env`
2. Find these lines (at the bottom):
   ```env
   GOOGLE_DRIVE_CLIENT_ID=
   GOOGLE_DRIVE_CLIENT_SECRET=
   ```
3. Paste your credentials:
   ```env
   GOOGLE_DRIVE_CLIENT_ID=YOUR-CLIENT-ID-HERE
   GOOGLE_DRIVE_CLIENT_SECRET=YOUR-CLIENT-SECRET-HERE
   ```
4. **Save the file**

---

## Step 8: Restart Backend

```bash
cd /Users/suhani/social-media-automation/backend
npm run dev
```

---

## Step 9: Test It! 🎉

1. Open browser: http://localhost:3001
2. Login to your dashboard
3. Go to **Accounts** page
4. Find **Google Drive** card
5. Click **"Connect Drive 💚"**
6. You'll go to Google authorization page
7. Click **"Allow"**
8. You'll be redirected back with success message!

---

## If You Get Stuck

**"App not verified" warning on Google page?**
- Click **"Advanced"**
- Click **"Go to Social Media Automation (unsafe)"**
- This is normal for testing - your app is safe!

**"Redirect URI mismatch" error?**
- Go back to Google Cloud Console
- Go to: APIs & Services → Credentials
- Click on your OAuth client
- Make sure redirect URI is exactly: `http://localhost:3000/api/drive/callback`
- No trailing slash!

**Can't find the setting?**
- Use the search bar at the top of Google Cloud Console
- Type what you're looking for (e.g., "OAuth consent screen")

---

## Need Help?

Let me know which step you're stuck on and I'll help you through it!

The whole process takes about 5-10 minutes the first time.
