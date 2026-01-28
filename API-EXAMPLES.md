# API Examples - Copy Paste Ready! 📋

Ye sab commands directly copy-paste kar sakte ho!

## Setup (Pehle ye karo)

```bash
# Terminal mein ye run karo (sirf ek baar)
export API_URL="http://localhost:3000/api"
export YOUR_TOKEN="paste-your-token-here-after-login"
```

---

## 1. USER REGISTRATION & LOGIN

### Register
```bash
curl -X POST ${API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suhani@stageott.com",
    "password": "Stage@123",
    "name": "Suhani"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "suhani@stageott.com",
    "name": "Suhani"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**🔥 TOKEN COPY KARO aur upar export command mein paste karo!**

### Login
```bash
curl -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suhani@stageott.com",
    "password": "Stage@123"
  }'
```

---

## 2. VIDEO UPLOAD

### Upload Single Video
```bash
curl -X POST ${API_URL}/videos/upload \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -F "video=@/Users/suhani/Desktop/Sequence 01.mp4" \
  -F "title=Videshi Bahu Trailer" \
  -F "description=New Haryanvi movie releasing 30 Jan 2026" \
  -F "language=HARYANVI"
```

**Response:**
```json
{
  "message": "Video uploaded successfully",
  "video": {
    "id": "video-uuid-save-this",
    "title": "Videshi Bahu Trailer",
    "status": "PENDING",
    ...
  }
}
```

### Get All Videos
```bash
curl -X GET ${API_URL}/videos \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

### Get Single Video
```bash
curl -X GET ${API_URL}/videos/VIDEO_ID_HERE \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

---

## 3. SOCIAL ACCOUNT CONNECTION

### Connect Instagram
```bash
curl -X POST ${API_URL}/accounts/connect \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "INSTAGRAM",
    "accessToken": "YOUR_INSTAGRAM_PAGE_ACCESS_TOKEN",
    "accountId": "17841400008460056",
    "username": "stageott_official"
  }'
```

**Response:**
```json
{
  "message": "Account connected successfully",
  "account": {
    "id": "account-uuid-save-this",
    "platform": "INSTAGRAM",
    "username": "stageott_official",
    "status": "ACTIVE"
  }
}
```

### Get All Connected Accounts
```bash
curl -X GET ${API_URL}/accounts \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

---

## 4. CREATE & PUBLISH POST

### Create Post (Haryanvi Caption)
```bash
curl -X POST ${API_URL}/posts \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID",
    "accountId": "YOUR_ACCOUNT_ID",
    "caption": "सै भाई! 🙏\n\nVideshi Bahu - 30 जनवरी को आ री है! 🎬\nथारे पूरे परिवार के साथ देखणा!\n\nTrailer देख लो अर share करो! 🔥",
    "language": "HARYANVI",
    "hashtags": ["#VidesiBahu", "#HaryanviMovie", "#30Jan", "#StageOTT", "#Haryanvi"],
    "platform": "INSTAGRAM",
    "postType": "REEL"
  }'
```

### Create Post (Hinglish Caption)
```bash
curl -X POST ${API_URL}/posts \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID",
    "accountId": "YOUR_ACCOUNT_ID",
    "caption": "Guys! Videshi Bahu ki trailer dekhi? 🤩\n\n30 January ko aa rahi hai! 🎬\nFamily ke saath dekhna mat bhoolna! \n\nTag karo apne doston ko! 👥",
    "language": "HINGLISH",
    "hashtags": ["#VidesiBahu", "#Bollywood", "#MovieTrailer", "#MustWatch"],
    "platform": "INSTAGRAM",
    "postType": "REEL"
  }'
```

### Get All Posts
```bash
curl -X GET ${API_URL}/posts \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

### Publish Post NOW
```bash
curl -X POST ${API_URL}/posts/YOUR_POST_ID/publish \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

**Response:**
```json
{
  "message": "Post published successfully",
  "post": {
    "id": "post-uuid",
    "status": "PUBLISHED",
    "platformPostId": "18123456789",
    "platformUrl": "https://www.instagram.com/p/ABC123/",
    ...
  }
}
```

---

## 5. SCHEDULE POST (Future Feature)

```bash
curl -X POST ${API_URL}/posts \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID",
    "accountId": "YOUR_ACCOUNT_ID",
    "caption": "Your caption here",
    "language": "HARYANVI",
    "hashtags": ["#Tag1", "#Tag2"],
    "platform": "INSTAGRAM",
    "postType": "REEL",
    "scheduledFor": "2026-01-30T09:00:00Z"
  }'
```

---

## 6. ANALYTICS

### Get All Analytics
```bash
curl -X GET "${API_URL}/analytics" \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

### Get Analytics by Date Range
```bash
curl -X GET "${API_URL}/analytics?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

### Get Analytics by Platform
```bash
curl -X GET "${API_URL}/analytics?platform=INSTAGRAM" \
  -H "Authorization: Bearer ${YOUR_TOKEN}"
```

---

## COMPLETE WORKFLOW EXAMPLE 🎬

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"suhani@test.com","password":"test123","name":"Suhani"}'

# Save token: export YOUR_TOKEN="your-token-here"

# 2. Upload Video
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -F "video=@/path/to/video.mp4" \
  -F "title=My Video" \
  -F "language=HARYANVI"

# Save video ID from response

# 3. Connect Instagram
curl -X POST http://localhost:3000/api/accounts/connect \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"platform":"INSTAGRAM","accessToken":"ig-token","accountId":"ig-id","username":"ig-user"}'

# Save account ID from response

# 4. Create Post
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer ${YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId":"VIDEO_ID",
    "accountId":"ACCOUNT_ID",
    "caption":"सै भाई! New video! 🔥",
    "language":"HARYANVI",
    "hashtags":["#Haryanvi"],
    "platform":"INSTAGRAM",
    "postType":"REEL"
  }'

# Save post ID from response

# 5. Publish
curl -X POST http://localhost:3000/api/posts/POST_ID/publish \
  -H "Authorization: Bearer ${YOUR_TOKEN}"

# DONE! Check Instagram! 🎉
```

---

## Testing with Postman 📮

1. **Postman Download:** https://www.postman.com/downloads/
2. **Import Collection:**
   - New Collection banao: "Social Media Automation"
   - Environment variable set karo:
     - `base_url`: `http://localhost:3000/api`
     - `token`: Your JWT token

3. **Sample Requests:**

**Register:**
- Method: POST
- URL: `{{base_url}}/auth/register`
- Body: JSON
```json
{
  "email": "test@test.com",
  "password": "test123",
  "name": "Test User"
}
```

**Upload Video:**
- Method: POST
- URL: `{{base_url}}/videos/upload`
- Headers: `Authorization: Bearer {{token}}`
- Body: form-data
  - Key: `video`, Type: File
  - Key: `title`, Value: "Test Video"
  - Key: `language`, Value: "HARYANVI"

---

## Pro Tips 💡

1. **Save IDs:** Har response mein `id` field ko save karo
2. **Token Expiry:** 7 days ke baad naya login karo
3. **Error Messages:** Response mein `error` field check karo
4. **Testing:** Pehle Postman mein test karo, phir code mein integrate karo

---

## Common Errors & Fixes 🔧

### 401 Unauthorized
```json
{"error":"No token provided"}
```
**Fix:** Authorization header add karo

### 404 Not Found
```json
{"error":"Video not found"}
```
**Fix:** Correct video/post/account ID use karo

### 400 Bad Request
```json
{"error":"Invalid credentials"}
```
**Fix:** Request body format check karo

---

**Happy Testing! 🚀**
