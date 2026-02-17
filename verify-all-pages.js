const { chromium } = require('playwright');

async function verifyAllPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('🔍 Verifying all pages...\n');

    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Login successful\n');

    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Videos', url: '/dashboard/videos' },
      { name: 'Posts', url: '/dashboard/posts' },
      { name: 'Calendar', url: '/dashboard/calendar' },
      { name: 'Accounts', url: '/dashboard/accounts' },
      { name: 'Analytics', url: '/dashboard/analytics' },
      { name: 'Settings', url: '/dashboard/settings' }
    ];

    for (const { name, url } of pages) {
      await page.goto(`http://localhost:3001${url}`);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      const title = await page.title();

      console.log(`📄 ${name}`);
      console.log(`   URL: ${currentUrl}`);
      console.log(`   Title: ${title}`);

      // Take screenshot
      const filename = `/tmp/page-${name.toLowerCase()}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`   Screenshot: ${filename}`);
      console.log('');
    }

    console.log('✅ All pages verified!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

verifyAllPages();
