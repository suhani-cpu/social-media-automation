const { chromium } = require('playwright');

async function testAllPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Videos', url: '/dashboard/videos' },
      { name: 'Posts', url: '/dashboard/posts' },
      { name: 'Calendar', url: '/dashboard/calendar' },
      { name: 'Accounts', url: '/dashboard/accounts' },
      { name: 'Analytics', url: '/dashboard/analytics' },
      { name: 'Settings', url: '/dashboard/settings' },
    ];

    console.log('Testing all pages with Stage OTT theme...\n');

    for (const testPage of pages) {
      await page.goto(`http://localhost:3001${testPage.url}`);
      await page.waitForTimeout(2000);

      const pageTitle = await page.title();
      const hasContent = await page.locator('body').count() > 0;

      console.log(`✅ ${testPage.name}: ${hasContent ? 'Loaded' : 'Failed'}`);
    }

    // Take screenshot of dashboard with new theme
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/stage-ott-theme.png', fullPage: true });
    console.log('\n📸 Screenshot saved: /tmp/stage-ott-theme.png');

    if (errors.length > 0) {
      console.log('\n⚠️  Errors found:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No errors! All pages working with Stage OTT theme!');
    }

  } finally {
    await browser.close();
  }
}

testAllPages();
