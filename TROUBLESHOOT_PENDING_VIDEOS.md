# Fix PENDING Videos Issue 🔧

## Problem: Videos showing PENDING, not posting

---

## Quick Checks:

### ✅ Step 1: Is Google Drive Connected?
1. Go to: **Dashboard → Accounts**
2. Check **Google Drive** card
3. Should show: **"Connected ✅"**
4. If NOT connected:
   - Click **"Connect Drive"**
   - Authorize your account

---

### ✅ Step 2: Check Sheet Links

Your sheet must have **direct video file links**, NOT folder links!

#### ❌ Wrong (Folder Link):
```
https://drive.google.com/drive/folders/ABC123
```

#### ✅ Correct (File Link):
```
https://drive.google.com/file/d/ABC123/view
```

---

### ✅ Step 3: Test Import

1. Go to Videos page
2. Delete all PENDING videos (if any)
3. Click "🚀 Auto Post All"
4. Wait 2-3 minutes
5. Check if videos show **READY** status

---

## Manual Fix for Existing PENDING Videos:

### Option A: Delete & Re-import
1. **Dashboard → Videos**
2. Delete all PENDING videos
3. Run Auto Post All again with correct Drive links

### Option B: Manual Upload
1. Download videos from your Drive manually
2. **Dashboard → Videos → Upload Video**
3. Upload each video one by one
4. Then create posts manually

---

## How to Get Direct Drive File Links:

1. Open Google Drive
2. Right-click on VIDEO file (not folder!)
3. Click **"Get link"**
4. Make sure it says **"Anyone with the link can view"**
5. Copy the link
6. Use this link in your sheet

---

## Testing:

### Test with ONE video first:
1. Pick ONE video file from your Drive
2. Get its direct link
3. Put in sheet
4. Run Auto Post All
5. Should show **READY** and post to Instagram

If this works, then do all videos!

---

## Still Not Working?

Run this command in terminal:
```bash
cd /Users/suhani/social-media-automation/backend
tail -50 /tmp/backend-youtube-ready.log
```

Copy the output and show me!
