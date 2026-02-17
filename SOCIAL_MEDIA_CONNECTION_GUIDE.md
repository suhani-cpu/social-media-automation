# Social Media Connection Guide 🔗

## 📱 क्यों Connect नहीं हो पा रहे हैं?

### ❌ समस्या (Problem):
आपने **OAuth credentials setup नहीं किया है**

**OAuth Credentials क्या है?**
- Instagram, YouTube, Facebook को connect करने के लिए आपको उनके Developer Portal से **API Keys** और **OAuth Credentials** चाहिए
- बिना credentials के कोई भी tool इन platforms से connect नहीं हो सकता

---

## ✅ Solution: हर Platform के लिए Setup Guide

### 1️⃣ Instagram Connection Setup (सबसे आसान!)

**Step 1: Facebook Developer Account बनाएं**
- जाएं: https://developers.facebook.com/
- Facebook account से login करें
- "My Apps" → "Create App" click करें

**Step 2: Instagram Graph API Enable करें**
- App Type: "Business" select करें
- App Name: "Stage OTT Social Media Tool"
- Products में "Instagram" add करें

**Step 3: Credentials Copy करें**
```
App ID: 123456789012345
App Secret: abcdef1234567890abcdef1234567890
```

**Step 4: Backend .env File में Add करें**
```bash
# Instagram/Facebook OAuth
INSTAGRAM_APP_ID=your-app-id-here
INSTAGRAM_APP_SECRET=your-app-secret-here
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback

FACEBOOK_APP_ID=same-as-instagram
FACEBOOK_APP_SECRET=same-as-instagram
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
```

**Step 5: Instagram Account को Business Account में Convert करें**
- Instagram App खोलें
- Settings → Account → Switch to Professional Account
- Business Account select करें

**Step 6: Facebook Page बनाएं और Instagram Connect करें**
- Facebook में एक Page बनाएं
- Page Settings → Instagram → Connect Account

**अब Connect Button काम करेगा! ✅**

---

### 2️⃣ YouTube Connection Setup

**Step 1: Google Cloud Console**
- जाएं: https://console.cloud.google.com/
- Gmail से login करें
- "New Project" create करें

**Step 2: YouTube Data API v3 Enable करें**
- APIs & Services → Library
- Search: "YouTube Data API v3"
- Enable करें

**Step 3: OAuth 2.0 Credentials बनाएं**
- APIs & Services → Credentials
- "Create Credentials" → "OAuth 2.0 Client ID"
- Application Type: "Web Application"
- Authorized redirect URIs:
  ```
  http://localhost:3000/api/oauth/youtube/callback
  ```

**Step 4: Credentials Copy करें**
```
Client ID: 123456789012-abcdefghijklmnop.apps.googleusercontent.com
Client Secret: GOCSPX-abcdefghijklmnopqrst
```

**Step 5: Backend .env में Add करें**
```bash
# YouTube OAuth
YOUTUBE_CLIENT_ID=your-client-id-here
YOUTUBE_CLIENT_SECRET=your-client-secret-here
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback
```

**अब YouTube Connect हो जाएगा! ✅**

---

### 3️⃣ Facebook Page Connection

Instagram के same credentials use करें:
```bash
FACEBOOK_APP_ID=same-as-instagram
FACEBOOK_APP_SECRET=same-as-instagram
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
```

**Facebook Page बनाना जरूरी है:**
- Personal profile से post नहीं कर सकते
- Facebook Page create करें
- Page को tool से connect करें

---

## 🚀 Quick Setup (All 3 Platforms)

**सभी credentials एक साथ:**

```bash
# Backend .env file में add करें:

# Instagram & Facebook (Same credentials)
INSTAGRAM_APP_ID=your-facebook-app-id
INSTAGRAM_APP_SECRET=your-facebook-app-secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

# YouTube
YOUTUBE_CLIENT_ID=your-google-oauth-client-id
YOUTUBE_CLIENT_SECRET=your-google-oauth-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback
```

**फिर server restart करें:**
```bash
cd /Users/suhani/social-media-automation
bash FINAL_TEST_AND_RUN.sh
```

---

## 📋 Checklist

### Instagram:
- [ ] Facebook Developer Account बनाया?
- [ ] App create किया?
- [ ] App ID और Secret copy किया?
- [ ] .env file में add किया?
- [ ] Instagram को Business Account बनाया?
- [ ] Facebook Page से Instagram connect किया?

### YouTube:
- [ ] Google Cloud Console account बनाया?
- [ ] Project create किया?
- [ ] YouTube Data API enable किया?
- [ ] OAuth 2.0 credentials बनाए?
- [ ] Client ID और Secret copy किया?
- [ ] .env file में add किया?

### Facebook:
- [ ] Facebook Page बनाया?
- [ ] Instagram के same credentials use किए?
- [ ] .env file में add किया?

---

## 💡 Important Notes

**Instagram:**
- ✅ Personal account को Business में convert करें
- ✅ Facebook Page जरूरी है
- ✅ Instagram Graph API use होता है

**YouTube:**
- ✅ Gmail account जरूरी है
- ✅ Google Cloud project चाहिए
- ✅ API quota: 10,000 units/day (free)

**Facebook:**
- ✅ Personal profile से post नहीं हो सकता
- ✅ Page बनाएं और उससे post करें
- ✅ Instagram के same App ID use करें

---

## ❓ अगर फिर भी Problem हो?

**मुझे ये बताएं:**
1. कौन सा platform connect नहीं हो रहा?
2. क्या error message आ रहा है?
3. क्या आपने credentials setup कर लिए हैं?

**मैं आपको step-by-step help करूंगा! 📞**

---

## 🎯 After Setup

**सब कुछ setup करने के बाद:**
1. Dashboard → Accounts page पर जाएं
2. "Connect Instagram" / "Connect YouTube" / "Connect Facebook" button click करें
3. Login page खुलेगा
4. Allow/Authorize करें
5. ✅ Connected!

**अब आप posts schedule और publish कर सकते हैं! 🚀**
