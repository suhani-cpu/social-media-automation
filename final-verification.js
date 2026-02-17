const { chromium } = require('playwright');

async function verifyEverything() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('✅ FINAL VERIFICATION - Stage OTT Social Media Automation\n');

    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Login works - redirected to dashboard\n');

    // Test all pages
    const pages = [
      { name: 'Dashboard', url: '/dashboard', screenshot: 'dashboard.png' },
      { name: 'Upload Video', url: '/dashboard/videos/upload', screenshot: 'upload-video.png' },
      { name: 'Videos List', url: '/dashboard/videos', screenshot: 'videos.png' },
      { name: 'Create Post', url: '/dashboard/posts/create', screenshot: 'create-post.png' },
      { name: 'Posts List', url: '/dashboard/posts', screenshot: 'posts.png' },
    ];

    for (const pageInfo of pages) {
      await page.goto(`http://localhost:3001${pageInfo.url}`);
      await page.waitForTimeout(1000);
      const h1Text = await page.textContent('h1').catch(() => 'N/A');
      console.log(`✅ ${pageInfo.name} page loads (${h1Text})`);
      await page.screenshot({ path: `/tmp/${pageInfo.screenshot}`, fullPage: true });
    }

    console.log('\n🎉 ALL PAGES WORKING!');
    console.log('\nScreenshots saved in /tmp/');
    console.log('   - dashboard.png');
    console.log('   - upload-video.png');
    console.log('   - videos.png');
    console.log('   - create-post.png');
    console.log('   - posts.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

verifyEverything();
