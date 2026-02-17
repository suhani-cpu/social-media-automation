const { chromium } = require('playwright');

async function testUploadAndCreate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('🧪 Testing Upload Video and Create Post pages...\n');

    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Logged in\n');

    // Test Videos Upload page
    console.log('Testing Videos Upload page...');
    await page.goto('http://localhost:3001/dashboard/videos/upload');
    await page.waitForTimeout(1000);
    const uploadUrl = page.url();
    const uploadTitle = await page.title();
    console.log(`   URL: ${uploadUrl}`);
    console.log(`   Title: ${uploadTitle}`);

    const uploadPageContent = await page.textContent('h1');
    if (uploadPageContent.includes('Upload Video')) {
      console.log('   ✅ Upload Video page loads correctly\n');
      await page.screenshot({ path: '/tmp/upload-video-page.png' });
    } else {
      console.log('   ❌ Upload Video page not loading correctly\n');
    }

    // Test Posts Create page
    console.log('Testing Posts Create page...');
    await page.goto('http://localhost:3001/dashboard/posts/create');
    await page.waitForTimeout(1000);
    const createUrl = page.url();
    const createTitle = await page.title();
    console.log(`   URL: ${createUrl}`);
    console.log(`   Title: ${createTitle}`);

    const createPageContent = await page.textContent('h1');
    if (createPageContent.includes('Create Post')) {
      console.log('   ✅ Create Post page loads correctly\n');
      await page.screenshot({ path: '/tmp/create-post-page.png' });
    } else {
      console.log('   ❌ Create Post page not loading correctly\n');
    }

    console.log('Screenshots saved:');
    console.log('   /tmp/upload-video-page.png');
    console.log('   /tmp/create-post-page.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testUploadAndCreate();
