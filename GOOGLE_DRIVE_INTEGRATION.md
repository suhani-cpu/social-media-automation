# Google Drive Integration Guide 📁☁️

## 🎯 Features We'll Add

### 1. Import Videos from Google Drive
- Browse your Google Drive
- Select videos to import
- Automatic download and processing

### 2. Auto-Backup Videos
- Uploaded videos → Auto-save to Drive
- Processed videos → Backup to Drive
- Organized folder structure

### 3. Auto-Sync
- Watch a Google Drive folder
- New videos automatically imported
- Set it and forget it!

---

## 🔧 Implementation Steps

### Step 1: Enable Google Drive API

**Go to Google Cloud Console:**
1. Visit: https://console.cloud.google.com/
2. Select your project (or create new one)
3. Go to "APIs & Services" → "Library"
4. Search: "Google Drive API"
5. Click "Enable"

### Step 2: Create OAuth Credentials

**Create credentials:**
1. "APIs & Services" → "Credentials"
2. "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "Stage OTT Social Media Tool"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/oauth/google-drive/callback
   https://yourdomain.com/api/oauth/google-drive/callback
   ```

**Copy these:**
```
Client ID: xxxxx.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxx
```

### Step 3: Add to Environment Variables

**Backend `.env` file:**
```bash
# Google Drive Integration
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/oauth/google-drive/callback

# Google Drive Settings
GOOGLE_DRIVE_FOLDER_ID=optional-specific-folder-id
GOOGLE_DRIVE_AUTO_SYNC=true
GOOGLE_DRIVE_BACKUP_ENABLED=true
```

---

## 📦 What Gets Installed

### Backend Dependencies:
```bash
npm install googleapis
npm install @google-cloud/storage
```

### New Files Created:
```
backend/src/services/google-drive/
├── auth.service.ts          # OAuth authentication
├── upload.service.ts         # Upload to Drive
├── download.service.ts       # Download from Drive
├── sync.service.ts           # Auto-sync functionality
└── types.ts                  # TypeScript types

backend/src/routes/
└── google-drive.routes.ts    # API endpoints
```

---

## 🎨 Frontend Features

### New UI Components:

**1. Google Drive Connect Button**
- Dashboard → Settings → Integrations
- "Connect Google Drive" button
- OAuth flow

**2. Import from Drive Modal**
- Videos page → "Import from Drive" button
- Browse folders
- Select videos
- Import with one click

**3. Auto-Sync Settings**
- Enable/disable auto-sync
- Choose folder to watch
- Sync interval (hourly, daily)

**4. Backup Settings**
- Auto-backup toggle
- Choose backup folder
- Delete local after backup option

---

## 🔄 How It Works

### Import Flow:
```
1. User clicks "Import from Drive"
2. Browse Google Drive folders
3. Select video(s)
4. Click "Import Selected"
5. Videos download in background
6. Auto-create video records in database
7. Process for social media
8. Ready to use!
```

### Auto-Sync Flow:
```
1. User enables auto-sync
2. Chooses Google Drive folder
3. Tool watches folder every hour
4. New videos detected
5. Auto-download and import
6. Notification sent to user
7. Videos ready in library
```

### Backup Flow:
```
1. User uploads video
2. Video saved locally
3. Auto-backup to Google Drive
4. Organized in folders:
   - /Stage OTT Videos/Raw/
   - /Stage OTT Videos/Processed/
   - /Stage OTT Videos/Instagram/
   - /Stage OTT Videos/YouTube/
5. Confirmation notification
```

---

## 📁 Google Drive Folder Structure

**Recommended setup:**
```
📁 Stage OTT Videos/
├── 📁 Raw Videos/           # Original uploads
├── 📁 Processed/            # Edited videos
│   ├── 📁 Instagram/
│   │   ├── 📁 Reels/
│   │   └── 📁 Feed/
│   ├── 📁 YouTube/
│   │   ├── 📁 Shorts/
│   │   └── 📁 Videos/
│   └── 📁 Facebook/
│       ├── 📁 Square/
│       └── 📁 Landscape/
└── 📁 Thumbnails/           # Video thumbnails
```

**Tool will auto-create these folders!**

---

## 🎯 Use Cases

### Use Case 1: Content Creator Workflow
```
1. Record videos on phone
2. Auto-upload to Google Drive (Google Photos sync)
3. Tool auto-imports from Drive
4. Edit and schedule posts
5. Publish to all platforms
```

### Use Case 2: Team Collaboration
```
1. Team uploads videos to shared Drive folder
2. Tool monitors folder
3. New videos auto-imported
4. Manager reviews and schedules
5. Auto-publish
```

### Use Case 3: Backup Strategy
```
1. Upload video to tool
2. Auto-backup to Drive
3. Process video
4. Processed versions also backed up
5. Delete local files to save space
6. All videos safe in cloud
```

---

## 💾 Storage Management

### Google Drive Free Tier:
- **15GB free storage**
- Shared across Gmail, Drive, Photos

### Optimization Tips:
1. **Delete local files after backup**
   - Free up server space
   - Keep only in Drive

2. **Compress before upload**
   - Tool can auto-compress
   - Save Drive space

3. **Organize by date**
   - Auto-create monthly folders
   - Easy to find videos

4. **Set retention policy**
   - Auto-delete old backups
   - Keep only recent videos

---

## 🔐 Security & Privacy

### What Access We Need:
```
Scopes Required:
- drive.file          # Access files created by this app
- drive.readonly      # Read files you choose to share
```

**We NEVER access:**
- ❌ Your other Drive files
- ❌ Your emails
- ❌ Your personal documents
- ❌ Anything you don't explicitly share

### Data Security:
- ✅ OAuth 2.0 authentication
- ✅ Encrypted transfers
- ✅ No permanent storage of tokens
- ✅ You can revoke access anytime

---

## 🚀 Implementation Timeline

### Phase 1: Basic Integration (2-3 hours)
- ✅ OAuth authentication
- ✅ Browse Drive folders
- ✅ Import single video
- ✅ Manual backup

### Phase 2: Advanced Features (3-4 hours)
- ✅ Bulk import
- ✅ Auto-sync
- ✅ Auto-backup
- ✅ Folder organization

### Phase 3: Polish (1-2 hours)
- ✅ Progress indicators
- ✅ Error handling
- ✅ Notifications
- ✅ Settings UI

**Total Time: 6-9 hours**

---

## 📊 Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| **Storage** | Local (limited) | Cloud (15GB free) |
| **Import** | Manual upload | Auto-sync from Drive |
| **Backup** | No backup | Auto-backup |
| **Team Work** | Single device | Shared Drive folder |
| **Mobile** | Can't access | Access via Drive app |
| **Safety** | Risk of data loss | Cloud backup |

---

## 🎉 What You'll Get

**Once implemented:**

1. **"Connect Google Drive" button** in Settings
2. **"Import from Drive" button** on Videos page
3. **Auto-sync toggle** in Settings
4. **Backup settings** panel
5. **Drive folder browser** modal
6. **Sync status** notifications
7. **Storage usage** indicator

**Your workflow becomes:**
```
Record → Upload to Drive → Auto-import → Edit → Publish
                ↓
        (All automatic!)
```

---

## ❓ FAQ

**Q: Will this slow down my tool?**
A: No! Downloads happen in background. You can continue working.

**Q: What if I run out of Google Drive space?**
A: Tool will notify you. You can upgrade Drive or enable auto-delete of old videos.

**Q: Can multiple people use the same Drive folder?**
A: Yes! Share folder with team. Everyone's videos auto-import.

**Q: What video formats work?**
A: Same as before: MP4, MOV, AVI, MKV (up to 1GB)

**Q: Can I choose what to backup?**
A: Yes! Settings let you choose:
- Backup raw videos only
- Backup processed only
- Backup everything
- No backup

---

## 🔧 Ready to Implement?

**Tell me:**
1. **Do you want me to implement this NOW?** (Takes 6-9 hours)
2. **Which features are most important?**
   - Import from Drive
   - Auto-backup
   - Auto-sync
   - All of them
3. **Do you already have videos in Google Drive?**

**I can start implementing immediately!** 🚀

---

## 💡 Alternative: Quick Setup

**If you want to start using this TODAY:**

I can implement a **quick version** (2 hours) with:
- ✅ Connect Google Drive
- ✅ Import videos manually
- ✅ Basic backup

Then add advanced features later!

**Your choice!** Let me know! 📝✨
