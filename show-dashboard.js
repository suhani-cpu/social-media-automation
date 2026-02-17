const { chromium } = require('playwright');

async function showDashboard() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('📸 Taking dashboard screenshots...\n');

    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Dashboard
    console.log('1️⃣  Dashboard main page...');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/dashboard-main.png', fullPage: true });
    console.log('   ✅ Saved: /tmp/dashboard-main.png');

    // Videos page
    console.log('\n2️⃣  Videos page...');
    await page.goto('http://localhost:3001/dashboard/videos');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/dashboard-videos.png', fullPage: true });
    console.log('   ✅ Saved: /tmp/dashboard-videos.png');

    // Posts page
    console.log('\n3️⃣  Posts page...');
    await page.goto('http://localhost:3001/dashboard/posts');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/dashboard-posts.png', fullPage: true });
    console.log('   ✅ Saved: /tmp/dashboard-posts.png');

    // Analytics page
    console.log('\n4️⃣  Analytics page...');
    await page.goto('http://localhost:3001/dashboard/analytics');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/dashboard-analytics.png', fullPage: true });
    console.log('   ✅ Saved: /tmp/dashboard-analytics.png');

    console.log('\n✅ All screenshots saved in /tmp/');
    console.log('\nYou can view them with:');
    console.log('   open /tmp/dashboard-main.png');
    console.log('   open /tmp/dashboard-videos.png');
    console.log('   open /tmp/dashboard-posts.png');
    console.log('   open /tmp/dashboard-analytics.png');

  } finally {
    await browser.close();
  }
}

showDashboard();
