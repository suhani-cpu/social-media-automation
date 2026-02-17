const { chromium } = require('playwright');

async function debugLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Capture failed requests
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push(`${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('🔍 Starting Debug Test...\n');

    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    console.log('✅ Login page loaded\n');

    // Fill and submit
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');

    console.log('🖱️  Clicking login button...\n');
    await page.click('button[type="submit"]');

    // Wait and watch
    await page.waitForTimeout(5000);

    console.log('📍 Current URL:', page.url());
    console.log('\n📋 Console Messages:');
    consoleMessages.forEach(msg => console.log('  ', msg));

    console.log('\n❌ JavaScript Errors:');
    if (errors.length > 0) {
      errors.forEach(err => console.log('  ', err));
    } else {
      console.log('   (none)');
    }

    console.log('\n🚫 Failed Requests:');
    if (failedRequests.length > 0) {
      failedRequests.forEach(req => console.log('  ', req));
    } else {
      console.log('   (none)');
    }

    // Check auth state
    const authState = await page.evaluate(() => {
      const storage = localStorage.getItem('auth-storage');
      return storage ? JSON.parse(storage) : null;
    });

    console.log('\n🔐 Auth State:');
    console.log('   Token:', authState?.state?.token ? 'PRESENT' : 'MISSING');
    console.log('   User:', authState?.state?.user?.name || 'MISSING');
    console.log('   isAuthenticated:', authState?.state?.isAuthenticated);

    // Take final screenshot
    await page.screenshot({ path: '/tmp/debug-final.png', fullPage: true });
    console.log('\n📸 Screenshot: /tmp/debug-final.png');

  } finally {
    await browser.close();
  }
}

debugLogin();
