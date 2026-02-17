const { chromium } = require('playwright');

async function testDashboardDirect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Testing direct dashboard access after setting auth...\n');

    // First, manually set auth in localStorage
    await page.goto('http://localhost:3001');

    await page.evaluate(() => {
      const authData = {
        state: {
          user: {
            id: "6475811d-cd6d-4054-9e88-99197cff6a9d",
            email: "suhani@stage.in",
            name: "Suhani Chikara",
            createdAt: "2026-01-29T05:04:15.583Z"
          },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDc1ODExZC1jZDZkLTQwNTQtOWU4OC05OTE5N2NmZjZhOWQiLCJpYXQiOjE3Njk2NjM5MzYsImV4cCI6MTc3MDI2ODczNn0.OjgAwPNQ7K5sP10AuBo5ifVnnp_sPdy875BUk-tRNiA",
          isAuthenticated: true
        },
        version: 0
      };
      localStorage.setItem('auth-storage', JSON.stringify(authData));
    });

    console.log('✅ Auth state manually set in localStorage');

    // Now try to navigate to dashboard
    console.log('\n📍 Navigating to /dashboard...');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle', timeout: 10000 });

    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log('📍 Final URL:', finalUrl);

    // Check what's visible
    const dashboardTitle = await page.isVisible('text=Dashboard').catch(() => false);
    const sidebar = await page.isVisible('text=Videos').catch(() => false);
    const welcomeMsg = await page.isVisible('text=Welcome back').catch(() => false);
    const loadingMsg = await page.isVisible('text=Loading').catch(() => false);

    console.log('\nWhat is visible:');
    console.log('   Dashboard title:', dashboardTitle ? '✅' : '❌');
    console.log('   Sidebar:', sidebar ? '✅' : '❌');
    console.log('   Welcome message:', welcomeMsg ? '✅' : '❌');
    console.log('   Loading message:', loadingMsg ? '✅' : '❌');

    await page.screenshot({ path: '/tmp/dashboard-direct.png', fullPage: true });
    console.log('\n📸 Screenshot: /tmp/dashboard-direct.png');

    if (finalUrl.includes('/dashboard') && (dashboardTitle || sidebar)) {
      console.log('\n✅ SUCCESS: Dashboard is accessible and showing!');
    } else if (finalUrl.includes('/dashboard')) {
      console.log('\n⚠️  Dashboard URL reached but content not rendering');
    } else {
      console.log('\n❌ Redirected away from dashboard to:', finalUrl);
    }

  } finally {
    await browser.close();
  }
}

testDashboardDirect();
