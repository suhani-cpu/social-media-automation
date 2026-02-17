const { chromium } = require('playwright');

async function debugLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('🔍 Debugging login flow...\n');

    // Go to login page
    await page.goto('http://localhost:3001/login');
    console.log('✅ Loaded login page');

    // Fill in credentials
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    console.log('✅ Filled credentials');

    // Listen to console messages
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('login')) {
        console.log('🌐 Login request:', request.method(), request.url());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('login')) {
        console.log('📥 Login response:', response.status());
        try {
          const body = await response.json();
          console.log('📦 Response body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('❌ Could not parse response');
        }
      }
    });

    // Click submit and wait
    console.log('🖱️  Clicking submit button...');
    await page.click('button[type="submit"]');

    // Wait a bit
    await page.waitForTimeout(3000);

    // Check current URL
    const currentUrl = page.url();
    console.log('✅ Current URL:', currentUrl);

    // Check localStorage
    const authData = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    console.log('💾 Auth storage:', authData ? 'Found' : 'Not found');
    if (authData) {
      console.log('Auth data:', authData);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/login-debug.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/login-debug.png');

    // Keep browser open briefly
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugLogin();
