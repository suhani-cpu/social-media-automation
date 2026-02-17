# Google Drive Integration Setup Guide

## Overview
The Google Drive integration allows you to:
- **Connect** your Google Drive account to the platform
- **Browse** folders and files in your Drive
- **Import** videos directly from Drive to your video library
- **Auto-backup** processed videos to Drive (optional)
- **Auto-sync** videos from specific Drive folders (optional)

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project** or select an existing project
3. Name your project (e.g., "Social Media Automation")
4. Click **Create**

### Step 2: Enable Google Drive API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**
4. Also search for "Google OAuth2 API" and enable it

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (unless you have a workspace)
   - App name: "Social Media Automation"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/drive.readonly`
   - Test users: Add your Google account email
4. Back to creating OAuth client ID:
   - Application type: **Web application**
   - Name: "Social Media Automation Backend"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/drive/callback` (for development)
     - `https://yourdomain.com/api/drive/callback` (for production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Configure Backend Environment Variables

1. Open `/backend/.env` file
2. Add the following variables:

```env
# Google Drive (for cloud storage and import)
GOOGLE_DRIVE_CLIENT_ID=your-client-id-from-step-3
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-from-step-3
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/drive/callback
```

**For Production:**
```env
GOOGLE_DRIVE_REDIRECT_URI=https://yourdomain.com/api/drive/callback
```

3. Save the file

### Step 5: Restart Backend Server

```bash
cd backend
npm run dev
```

The backend will now be ready to accept Google Drive connections!

## How to Use

### Connect Google Drive Account

1. Log into your dashboard
2. Go to **Accounts** page
3. Click **Connect Google Drive**
4. You'll be redirected to Google's authorization page
5. Select your Google account
6. Click **Allow** to grant permissions
7. You'll be redirected back to your dashboard

### Import Videos from Drive

#### Method 1: Browse and Import
1. Go to **Videos** → **Import from Drive**
2. Browse your Drive folders
3. Select videos you want to import
4. Click **Import Selected**
5. Videos will be downloaded and added to your library

#### Method 2: Bulk Import
1. In Drive import modal, select multiple videos (up to 10)
2. Click **Import All**
3. Videos will be processed in the background

### Auto-Backup (Optional - Phase 2)
- Configure in **Settings** → **Google Drive**
- Enable "Auto-backup processed videos"
- Select backup folder in your Drive
- All processed videos will be automatically backed up

### Auto-Sync (Optional - Phase 3)
- Configure in **Settings** → **Google Drive**
- Enable "Auto-sync from folder"
- Select a Drive folder to watch
- New videos added to that folder will automatically be imported

## API Endpoints

### Authentication
- `GET /api/drive/auth` - Start OAuth flow
- `GET /api/drive/callback` - OAuth callback handler
- `GET /api/drive/status` - Check connection status
- `POST /api/drive/disconnect` - Disconnect Drive account

### Browse Drive
- `GET /api/drive/folders?parentId={id}` - List folders
- `GET /api/drive/files?folderId={id}&videosOnly=true` - List files
- `GET /api/drive/files/:fileId` - Get file metadata

### Import Videos
- `POST /api/drive/import` - Import single video
  ```json
  {
    "fileId": "drive-file-id",
    "title": "Optional custom title"
  }
  ```

- `POST /api/drive/import/multiple` - Import up to 10 videos
  ```json
  {
    "fileIds": ["id1", "id2", "id3"]
  }
  ```

## Video Storage Flow

When you import a video from Google Drive:

1. **Download** - Video is downloaded to `/tmp/drive-imports`
2. **Create Record** - Video record created in database with status `PENDING`
3. **Process** - Video is processed into platform-specific formats
4. **Upload to S3** - Processed videos uploaded to permanent storage
5. **Update Status** - Video status changed to `READY`
6. **Cleanup** - Temporary files deleted

## Supported Video Formats

The following video formats are supported for import:
- MP4 (`.mp4`)
- MPEG (`.mpeg`, `.mpg`)
- QuickTime (`.mov`)
- AVI (`.avi`)
- Matroska (`.mkv`)
- WebM (`.webm`)

## Troubleshooting

### "Google Drive account not connected"
- Make sure you've completed the OAuth flow
- Check database: `SELECT * FROM "SocialAccount" WHERE platform = 'GOOGLE_DRIVE';`
- Verify token hasn't expired

### "Invalid credentials"
- Double-check `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`
- Ensure credentials match the redirect URI
- Verify OAuth consent screen is configured correctly

### "Rate limit exceeded"
- Google Drive API has quotas: 1,000 requests per 100 seconds per user
- If you hit limits, wait a minute and retry
- Consider implementing retry logic with exponential backoff

### "File not found"
- File may have been deleted from Drive
- Check if you have permission to access the file
- Verify the file ID is correct

### Token expired
- The system automatically refreshes tokens
- If refresh fails, disconnect and reconnect your account

## Security Notes

- **Scopes**: We only request `drive.file` and `drive.readonly` scopes (minimal access)
- **Tokens**: Access tokens are stored encrypted in the database
- **Refresh**: Tokens are automatically refreshed when expired
- **Revoke**: Users can disconnect Drive anytime in settings

## Folder Structure

When auto-backup is enabled, the following folder structure is created in your Drive:

```
Stage OTT Videos/
├── Raw Videos/          # Original uploaded videos
├── Processed/           # Platform-specific processed videos
└── Thumbnails/          # Auto-generated thumbnails
```

## Next Steps

Now that Google Drive is set up, you can:
1. Test the connection in your dashboard
2. Import your first video from Drive
3. Configure auto-backup (Phase 2)
4. Set up auto-sync from a folder (Phase 3)

For issues or questions, check the logs:
```bash
tail -f backend/logs/combined.log
```
