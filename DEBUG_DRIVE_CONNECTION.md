# Debug Google Drive Connection Issue

## Quick Checks:

### 1. Are you logged in?
- You MUST be logged in to your dashboard first
- Go to http://localhost:3001/login
- Login with your email and password
- Then go to Accounts page

### 2. Check Browser Console for Errors
1. Open http://localhost:3001/dashboard/accounts
2. Press F12 (or Cmd+Option+I on Mac) to open Developer Tools
3. Click on the "Console" tab
4. Click "Connect Drive" button
5. Look for any red error messages

**Common errors:**
- "401 Unauthorized" = You're not logged in
- "Network error" = Backend not running
- "CORS error" = Configuration issue

### 3. Test Backend Endpoint Directly

Open a new terminal and run:
```bash
# First, login and get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Copy the token from the response, then test:
curl -X GET http://localhost:3000/api/drive/auth \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

You should see:
```json
{
  "message": "Authorization URL generated",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 4. Check if Button is Working

In browser console (F12), paste this:
```javascript
// Test if the button exists
document.querySelector('button:contains("Connect Drive")');

// Or check all buttons
document.querySelectorAll('button');
```

### 5. Manual Test

Try this URL directly in your browser (replace YOUR_USER_ID):
```
http://localhost:3000/api/drive/auth
```

⚠️ This will fail with 401 if you're not logged in!

## What to Tell Me:

Please tell me:
1. **Are you logged in?** (Can you see your dashboard?)
2. **What happens when you click "Connect Drive"?**
   - Nothing happens?
   - Error message shows?
   - Button just keeps spinning?
3. **Any errors in browser console?** (Press F12 to check)
4. **Can you see the Google Drive card?** (Green gradient card on Accounts page)

## Quick Fix to Try:

1. **Logout and Login again**
   - Click your profile picture → Logout
   - Login again
   - Try connecting Drive

2. **Hard refresh the page**
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Try again

3. **Clear browser cache**
   - Settings → Privacy → Clear browsing data
   - Check "Cached images and files"
   - Clear data

## Still Not Working?

If none of this works, I'll need to know:
- What error messages you see (screenshot if possible)
- What happens step by step when you click the button
- Whether you're logged in or not
