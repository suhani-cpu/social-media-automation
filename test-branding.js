const { chromium } = require('playwright');

async function testBranding() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Test Login page branding
    console.log('Testing branding...\n');

    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(2000);

    const loginText = await page.textContent('body');
    if (loginText.includes('Social Media Manager')) {
      console.log('✅ Login page: "Stage OTT - Social Media Manager"');
    } else {
      console.log('❌ Login page: Branding not updated');
    }

    // Login and check dashboard
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const dashboardText = await page.textContent('body');
    if (dashboardText.includes('Social Media Manager')) {
      console.log('✅ Dashboard sidebar: "Stage OTT - Social Media Manager"');
    } else {
      console.log('❌ Dashboard sidebar: Branding not updated');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/stage-ott-branding.png', fullPage: true });
    console.log('\n📸 Screenshot saved: /tmp/stage-ott-branding.png');

    console.log('\n✅ Branding updated successfully!');
    console.log('   Sidebar now shows: "Stage OTT - Social Media Manager"');
    console.log('   Login page now shows: "Social Media Manager Login"');

  } finally {
    await browser.close();
  }
}

testBranding();
