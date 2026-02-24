# Social Media Automation — CMS Integration Guide

## Overview
Social Media Automation (Drive se Post tak) is a full-stack tool for automating social media content publishing across Instagram, YouTube, and Facebook. It is fully embeddable in any CMS via a simple script tag.

## Architecture
- **Frontend:** Next.js 14 on Vercel
- **Backend:** NestJS on Railway/Render
- **Database:** PostgreSQL (Prisma ORM)
- **Queue:** Redis + Bull

---

## Quick Start — Embed in CMS

### Basic Embed
```html
<script src="https://YOUR_FRONTEND_URL/embed.js"></script>
```

### Advanced Embed with Options
```html
<div id="sma-embed"></div>
<script src="https://YOUR_FRONTEND_URL/embed.js"
        data-container="sma-embed"
        data-width="100%"
        data-height="800px"
        data-theme="dark">
</script>
```

---

## Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-container` | string | `sma-embed` | ID of div to mount in |
| `data-width` | string | `100%` | Iframe width (px, %, vw) |
| `data-height` | string | `800px` | Iframe height (px, %, vh) |
| `data-theme` | string | `dark` | Theme (light/dark) |
| `data-api-key` | string | null | API key for authenticated access |
| `data-project-id` | string | null | Pre-load specific project |

---

## JavaScript API

After loading the embed script, control it programmatically:

```javascript
// Reload the tool
window.SocialMediaAutomation.reload();

// Destroy the embed
window.SocialMediaAutomation.destroy();

// Re-mount
window.SocialMediaAutomation.mount();

// Get current config
const config = window.SocialMediaAutomation.config();

// Send message to iframe
window.SocialMediaAutomation.postMessage({
  type: 'CUSTOM_EVENT',
  data: { foo: 'bar' }
});
```

---

## CMS Platform Instructions

### WordPress
**Method 1: Plugin (Recommended)**
1. Install "Insert Headers and Footers" plugin
2. Go to Settings > Insert Headers and Footers
3. Paste embed script in Footer section
4. Click Save

**Method 2: Theme Editor**
1. Go to Appearance > Theme Editor
2. Select footer.php
3. Add script tag before `</body>`
4. Click Update File

### Webflow
1. Go to Project Settings
2. Click Custom Code tab
3. Add script to Footer Code section
4. Click Save Changes
5. Publish site

### Wix
1. Go to Settings in dashboard
2. Click Custom Code
3. Click + Add Custom Code
4. Paste script
5. Select Body - End placement
6. Click Apply

### Squarespace
1. Go to Settings
2. Click Advanced
3. Click Code Injection
4. Paste script in Footer section
5. Click Save

### Drupal
1. Go to Structure > Blocks
2. Click Add custom block
3. Set Text format to Full HTML
4. Paste script in Body field
5. Assign block to Footer region

### Shopify
1. Go to Online Store > Themes
2. Click Actions > Edit code
3. Open theme.liquid
4. Add script before `</body>`
5. Click Save

---

## Security

### CORS
Backend is configured with `ALLOW_ALL_ORIGINS=true` for CMS mode, accepting requests from any origin.

### CSP (Content Security Policy)
If your CMS has CSP headers, add:
```
frame-src https://YOUR_FRONTEND_URL;
script-src https://YOUR_FRONTEND_URL;
connect-src https://YOUR_BACKEND_URL;
```

### Iframe Sandbox
The embed uses these permissions:
- `allow-scripts` — Run JavaScript
- `allow-same-origin` — Access localStorage
- `allow-forms` — Submit forms
- `allow-popups` — OAuth and file dialogs
- `allow-popups-to-escape-sandbox` — OAuth flows

---

## API Endpoints

### Base URL
```
https://YOUR_BACKEND_URL/api
```

### Authentication
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Key Endpoints
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `GET /api/posts` — List posts
- `POST /api/posts` — Create post
- `POST /api/posts/:id/publish` — Publish post
- `GET /api/posts/:id/publish-progress` — Publish progress
- `GET /api/videos` — List videos
- `GET /api/analytics` — Analytics summary
- `GET /api/health` — Health check
- `GET /api/health/db` — Database health

---

## Troubleshooting

### Iframe doesn't load
1. Check browser console for errors (F12)
2. Verify script URL is correct
3. Check if CSP is blocking iframe
4. Try disabling ad blockers

### CORS errors
1. Check backend `ALLOW_ALL_ORIGINS=true`
2. Verify `ALLOWED_ORIGINS` includes your domain

### Authentication issues
1. Verify `data-api-key` is correct
2. Ensure cookies are enabled
3. Check third-party cookie settings

### Blank screen in iframe
1. Check browser console for JS errors
2. Verify backend health: `https://YOUR_BACKEND_URL/api/health`
3. Verify DB: `https://YOUR_BACKEND_URL/api/health/db`

---

## Testing

### Live Test Page
```
https://YOUR_FRONTEND_URL/embed-test.html
```

### Sample HTML
```html
<!DOCTYPE html>
<html>
<head><title>Test SMA Embed</title></head>
<body>
    <h1>Social Media Automation</h1>
    <div id="sma-embed"></div>
    <script src="https://YOUR_FRONTEND_URL/embed.js"
            data-container="sma-embed"
            data-width="100%"
            data-height="700px"
            data-theme="dark">
    </script>
</body>
</html>
```

---

## Version
- Frontend: 1.0.0
- Backend: 1.0.0
- Embed Script: 1.0.0
- Last Updated: 2026-02-23
