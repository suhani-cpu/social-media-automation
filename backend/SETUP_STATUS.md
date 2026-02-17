# ⚙️ Setup Status

Run this command to see what's configured:

```bash
cd /Users/suhani/social-media-automation/backend
node -e "
require('dotenv').config();
console.log('\n🔍 OAuth Configuration Status\n');
console.log('=' .repeat(50));
console.log('\n📺 YOUTUBE:');
console.log('  Client ID:', process.env.YOUTUBE_CLIENT_ID ? '✅ SET' : '❌ NOT SET');
console.log('  Client Secret:', process.env.YOUTUBE_CLIENT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('  Redirect URI:', process.env.YOUTUBE_REDIRECT_URI || '❌ NOT SET');
console.log('\n👥 FACEBOOK:');
console.log('  App ID:', process.env.FACEBOOK_APP_ID ? '✅ SET' : '❌ NOT SET');
console.log('  App Secret:', process.env.FACEBOOK_APP_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('  Redirect URI:', process.env.FACEBOOK_REDIRECT_URI || '❌ NOT SET');
console.log('\n=' .repeat(50));
const ready = (process.env.YOUTUBE_CLIENT_ID && process.env.FACEBOOK_APP_ID);
console.log(ready ? '\n✅ Ready to connect!\n' : '\n❌ Not ready - credentials missing\n');
"
```

## What You'll See:

### If NOT configured (current state):
```
📺 YOUTUBE:
  Client ID: ❌ NOT SET
  Client Secret: ❌ NOT SET

👥 FACEBOOK:
  App ID: ❌ NOT SET
  App Secret: ❌ NOT SET

❌ Not ready - credentials missing
```

### After you add credentials:
```
📺 YOUTUBE:
  Client ID: ✅ SET
  Client Secret: ✅ SET

👥 FACEBOOK:
  App ID: ✅ SET
  App Secret: ✅ SET

✅ Ready to connect!
```

## How to Fix:

1. Get credentials from:
   - YouTube: https://console.cloud.google.com/
   - Facebook: https://developers.facebook.com/

2. Edit this file:
   `/Users/suhani/social-media-automation/backend/.env`

3. Update these lines:
   ```env
   YOUTUBE_CLIENT_ID=your-youtube-client-id
   YOUTUBE_CLIENT_SECRET=your-youtube-secret
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-secret
   ```

4. Restart backend:
   ```bash
   cd /Users/suhani/social-media-automation/backend
   # Press Ctrl+C to stop
   npm run dev
   ```

5. Try connecting again!

## Need Help?

Read: `/Users/suhani/social-media-automation/TROUBLESHOOTING.md`

It has complete step-by-step instructions with screenshots descriptions!
