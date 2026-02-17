const { chromium } = require('playwright');

async function showDashboard() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('📸 Taking dashboard screenshots (with longer wait)...\n');

    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(5000);

    // Dashboard
    console.log('1️⃣  Dashboard main page...');
    await page.screenshot({ path: '/tmp/dashboard-full.png', fullPage: true });
    console.log('   ✅ Saved: /tmp/dashboard-full.png');

    console.log('\n✅ Screenshot saved!');
    console.log('\nView with: open /tmp/dashboard-full.png');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTaking error screenshot...');
    await page.screenshot({ path: '/tmp/dashboard-error.png', fullPage: true });
    console.log('Saved: /tmp/dashboard-error.png');
  } finally {
    await browser.close();
  }
}

showDashboard();
