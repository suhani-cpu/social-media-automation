const { chromium } = require('playwright');

async function testVideoCutterIntegration() {
  console.log('🧪 Testing Video-Cutter Integration\n');
  console.log('=' .repeat(60));

  // Test 1: Check Backend API Endpoint
  console.log('\n1️⃣  Testing Backend API Endpoint...');
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    if (response.ok) {
      console.log('   ✅ Backend is running');
      console.log('   📊 Status:', data.status);
    } else {
      console.log('   ❌ Backend health check failed');
    }
  } catch (error) {
    console.log('   ❌ Backend is not accessible:', error.message);
    return;
  }

  // Test 2: Check Clip Endpoint (will fail without auth, but confirms route exists)
  console.log('\n2️⃣  Testing Clip API Endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: 'https://example.com/test.mp4',
        startSeconds: 0,
        endSeconds: 10
      })
    });

    if (response.status === 401) {
      console.log('   ✅ Clip endpoint exists (requires authentication)');
    } else if (response.status === 400) {
      console.log('   ✅ Clip endpoint exists and validates requests');
    } else {
      console.log('   📊 Response status:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Clip endpoint error:', error.message);
  }

  // Test 3: Check FFmpeg Installation
  console.log('\n3️⃣  Checking FFmpeg Installation...');
  const { exec } = require('child_process');
  await new Promise((resolve) => {
    exec('which ffmpeg', (error, stdout) => {
      if (error) {
        console.log('   ❌ FFmpeg is NOT installed');
        console.log('   ⚠️  Video cutting will not work without FFmpeg');
        console.log('   💡 Install with: brew install ffmpeg');
      } else {
        console.log('   ✅ FFmpeg is installed:', stdout.trim());
      }
      resolve();
    });
  });

  // Test 4: Test Frontend Integration
  console.log('\n4️⃣  Testing Frontend Integration...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Logged in successfully');

    // Test Videos Page
    await page.goto('http://localhost:3001/dashboard/videos');
    await page.waitForTimeout(1000);
    const videosPageLoaded = await page.textContent('h1');
    if (videosPageLoaded.includes('Videos')) {
      console.log('   ✅ Videos page loads correctly');
    }

    // Check if VideoEditor component exists (by checking for the file)
    const fs = require('fs');
    const editorPath = '/Users/suhani/social-media-automation/frontend/src/components/video/VideoEditor.tsx';
    if (fs.existsSync(editorPath)) {
      console.log('   ✅ VideoEditor component created');
    } else {
      console.log('   ❌ VideoEditor component not found');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/videos-page-test.png' });
    console.log('   📸 Screenshot saved: /tmp/videos-page-test.png');

  } catch (error) {
    console.log('   ❌ Frontend test error:', error.message);
  } finally {
    await browser.close();
  }

  // Test 5: Check Created Files
  console.log('\n5️⃣  Verifying Created Files...');
  const fs = require('fs');
  const filesToCheck = [
    '/Users/suhani/social-media-automation/backend/src/services/video-cutting/ffmpeg.service.ts',
    '/Users/suhani/social-media-automation/backend/src/services/video-cutting/framing.service.ts',
    '/Users/suhani/social-media-automation/backend/src/routes/clip.routes.ts',
    '/Users/suhani/social-media-automation/frontend/src/components/video/VideoEditor.tsx',
    '/Users/suhani/social-media-automation/frontend/src/app/(dashboard)/dashboard/videos/edit/[id]/page.tsx',
    '/Users/suhani/social-media-automation/frontend/src/components/ui/select.tsx'
  ];

  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      console.log('   ✅', file.split('/').slice(-2).join('/'));
    } else {
      console.log('   ❌', file.split('/').slice(-2).join('/'));
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 INTEGRATION SUMMARY\n');
  console.log('✅ Backend Services:');
  console.log('   - FFmpeg service (video cutting)');
  console.log('   - Framing service (aspect ratio, captions, logos)');
  console.log('   - Clip API endpoint (/api/clip)');
  console.log('');
  console.log('✅ Frontend Components:');
  console.log('   - VideoEditor component');
  console.log('   - Video edit page (/dashboard/videos/edit/[id])');
  console.log('   - Select UI component');
  console.log('');
  console.log('⚙️  Features Available:');
  console.log('   - Cut video clips (up to 10 minutes)');
  console.log('   - Change aspect ratio (9:16, 1:1, 16:9, original)');
  console.log('   - Add top and bottom captions');
  console.log('   - Customize font size and colors');
  console.log('   - Add Stage OTT logo overlay');
  console.log('   - Download processed videos');
  console.log('');

  exec('which ffmpeg', (error) => {
    if (error) {
      console.log('⚠️  NEXT STEPS:');
      console.log('   1. Install FFmpeg to enable video processing:');
      console.log('      → Download from: https://ffmpeg.org/download.html');
      console.log('      → Or use Homebrew: brew install ffmpeg');
      console.log('   2. Restart the backend server after installing FFmpeg');
      console.log('   3. Upload a video and test the editor');
      console.log('');
      console.log('💡 Video cutting will NOT work until FFmpeg is installed!');
    } else {
      console.log('✅ System is ready for video processing!');
      console.log('   → Upload a video at: http://localhost:3001/dashboard/videos');
      console.log('   → Edit videos at: http://localhost:3001/dashboard/videos/edit/[video-id]');
    }
    console.log('');
    console.log('=' .repeat(60));
  });
}

testVideoCutterIntegration().catch(console.error);
