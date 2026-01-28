# Quick Start Guide - 5 Minutes Setup! ⚡

## Bilkul Simple Steps - Tech knowledge nahi chahiye!

### Step 1: Open Terminal (1 minute)

**Mac:**
- Command + Space dabao
- "Terminal" type karo
- Enter dabao

**Windows:**
- Windows key dabao
- "cmd" type karo
- Enter dabao

---

### Step 2: Setup Database (2 minutes)

Terminal mein ye paste karo aur Enter dabao:

```bash
cd /Users/suhani/social-media-automation
docker-compose up -d
```

Wait karo 1-2 minutes... Docker database start kar raha hai.

✅ Ye message aaye: "Container social-media-postgres Started"

---

### Step 3: Install Backend (2 minutes)

Terminal mein ye paste karo:

```bash
cd backend
npm install
```

Wait karo... packages install ho rahe hain (2-3 minutes)

✅ Jab complete ho jaye, run karo:

```bash
npm run prisma:migrate
```

✅ Database tables ban gaye!

---

### Step 4: Start Server! (1 minute)

Terminal mein ye run karo:

```bash
npm run dev
```

✅ Ye message aana chahiye:
```
🚀 Server running on port 3000
✅ Database connected successfully
```

**DONE! Server chal raha hai!** 🎉

---

## Ab Test Karo! 🧪

### Test 1: Health Check

Browser kholo aur jao: http://localhost:3000/health

✅ Ye dikhna chahiye: `{"status":"ok"}`

---

### Test 2: Register User

Naya terminal window kholo aur run karo:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suhani@stageott.com",
    "password": "password123",
    "name": "Suhani"
  }'
```

✅ Response mein `token` milega - isko copy karo!

**TOKEN SAVE KARO! Har API call mein use hoga!**

---

### Test 3: Upload Video (Replace YOUR_TOKEN)

```bash
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "video=@/Users/suhani/Desktop/Sequence 01.mp4" \
  -F "title=Test Video" \
  -F "language=HARYANVI"
```

✅ Video upload ho gaya!

---

## Instagram Se Connect Karo 📱

### Pehle ye karo:

1. **Instagram Business Account banao:**
   - Instagram app kholo
   - Settings → Account → Switch to Professional Account
   - "Business" select karo

2. **Facebook Page banao:**
   - Facebook pe jao
   - "Create" → "Page" → Business type
   - Instagram account se link karo

3. **Facebook Developer Account:**
   - https://developers.facebook.com/ pe jao
   - "Create App" → "Business" type
   - Instagram Graph API add karo

4. **Access Token Generate Karo:**
   - Graph API Explorer: https://developers.facebook.com/tools/explorer/
   - Permissions select karo:
     - `instagram_basic`
     - `instagram_content_publish`
     - `pages_read_engagement`
   - "Generate Access Token" button dabao
   - Token copy karo!

### Phir Account Connect Karo:

```bash
curl -X POST http://localhost:3000/api/accounts/connect \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "INSTAGRAM",
    "accessToken": "YOUR_INSTAGRAM_ACCESS_TOKEN",
    "accountId": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "username": "your_instagram_username"
  }'
```

✅ Instagram account connected!

---

## Post Karo Instagram Pe! 🎬

### Step 1: Caption Generate Karo

Postman ya code mein:

```javascript
const { generateCaption } = require('./backend/src/services/caption/generator');

const captions = await generateCaption({
  videoTitle: "Videshi Bahu",
  platform: "INSTAGRAM",
  language: "HARYANVI",
  tone: ["fun", "regional"]
});

console.log(captions[0].caption);
```

### Step 2: Post Create Karo

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "VIDEO_ID_FROM_UPLOAD_RESPONSE",
    "accountId": "ACCOUNT_ID_FROM_CONNECT_RESPONSE",
    "caption": "सै भाई! Videshi Bahu 30 जनवरी को! 🎬",
    "language": "HARYANVI",
    "hashtags": ["#VidesiBahu", "#Haryanvi"],
    "platform": "INSTAGRAM",
    "postType": "REEL"
  }'
```

### Step 3: Publish!

```bash
curl -X POST http://localhost:3000/api/posts/POST_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

✅ **Instagram pe post ho gaya!** 🎉🎉🎉

---

## Troubleshooting 🔧

### Problem: "Cannot find module"
```bash
cd /Users/suhani/social-media-automation/backend
npm install
```

### Problem: "Database connection failed"
```bash
docker-compose restart
npm run prisma:migrate
```

### Problem: "Port already in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill

# Restart server
npm run dev
```

### Problem: "Instagram API error"
- Access token valid hai check karo
- Instagram Business account hai (not personal!)
- Facebook Page se linked hai

---

## Ab Kya? 🚀

✅ **Backend ready hai!**
✅ **Database setup hai!**
✅ **Instagram posting working hai!**

**Next steps:**
1. Frontend dashboard banana (optional - API se directly bhi kaam kar sakte ho)
2. YouTube aur Facebook integration
3. Scheduling system
4. Stage OTT automatic fetching

**Abhi ke liye:**
- Postman install karo: https://www.postman.com/
- API endpoints easily test kar sakte ho
- Ya code likh kar integrate kar sakte ho

---

## Questions? 💬

README.md dekho - detailed documentation hai!

**Happy Posting! 🎬✨**
