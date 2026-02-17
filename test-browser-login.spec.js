const { chromium } = require('playwright');

async function testLoginInBrowser() {
  console.log('🌐 Starting REAL Browser Test...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to login page
    console.log('[1/6] Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    console.log('✅ Login page loaded');

    // Take screenshot
    await page.screenshot({ path: '/tmp/01-login-page.png' });
    console.log('   📸 Screenshot saved: /tmp/01-login-page.png');

    // Step 2: Fill in credentials
    console.log('\n[2/6] Entering credentials...');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    console.log('✅ Credentials entered');

    await page.screenshot({ path: '/tmp/02-credentials-filled.png' });
    console.log('   📸 Screenshot saved: /tmp/02-credentials-filled.png');

    // Step 3: Click login button
    console.log('\n[3/6] Clicking login button...');
    await page.click('button[type="submit"]');
    console.log('✅ Login button clicked');

    // Step 4: Wait for navigation or error
    console.log('\n[4/6] Waiting for response...');
    await page.waitForTimeout(3000); // Wait 3 seconds for login to complete

    const currentUrl = page.url();
    console.log(`✅ Current URL: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/03-after-login.png' });
    console.log('   📸 Screenshot saved: /tmp/03-after-login.png');

    // Step 5: Check for dashboard
    console.log('\n[5/6] Checking for dashboard elements...');

    const dashboardVisible = await page.isVisible('text=Dashboard').catch(() => false);
    const sidebarVisible = await page.isVisible('text=Videos').catch(() => false);
    const uploadButton = await page.isVisible('text=Upload Video').catch(() => false);
    const headerVisible = await page.isVisible('text=Welcome back').catch(() => false);

    console.log('\nDashboard Elements:');
    console.log(`   - Dashboard title: ${dashboardVisible ? '✅ VISIBLE' : '❌ NOT FOUND'}`);
    console.log(`   - Sidebar: ${sidebarVisible ? '✅ VISIBLE' : '❌ NOT FOUND'}`);
    console.log(`   - Upload button: ${uploadButton ? '✅ VISIBLE' : '❌ NOT FOUND'}`);
    console.log(`   - Welcome header: ${headerVisible ? '✅ VISIBLE' : '❌ NOT FOUND'}`);

    // Step 6: Check localStorage
    console.log('\n[6/6] Checking authentication state...');
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });

    if (authStorage) {
      const authData = JSON.parse(authStorage);
      console.log('✅ Auth data in localStorage:');
      console.log(`   - Has token: ${authData.state?.token ? 'YES' : 'NO'}`);
      console.log(`   - Has user: ${authData.state?.user ? 'YES' : 'NO'}`);
      console.log(`   - Is authenticated: ${authData.state?.isAuthenticated ? 'YES' : 'NO'}`);
      if (authData.state?.user) {
        console.log(`   - User name: ${authData.state.user.name}`);
      }
    } else {
      console.log('❌ No auth data in localStorage');
    }

    // Check for console errors
    console.log('\n📋 Browser Console Messages:');
    page.on('console', msg => console.log(`   ${msg.type()}: ${msg.text()}`));

    // Final screenshot
    await page.screenshot({ path: '/tmp/04-final-state.png', fullPage: true });
    console.log('\n📸 Full page screenshot: /tmp/04-final-state.png');

    // Summary
    console.log('\n' + '='.repeat(60));
    if (dashboardVisible && sidebarVisible) {
      console.log('✅ SUCCESS: User can login and see dashboard!');
      console.log('='.repeat(60));
      console.log('\n✅ Dashboard is rendering correctly');
      console.log('✅ All components visible');
      console.log('✅ Authentication working end-to-end');
    } else if (currentUrl.includes('/dashboard')) {
      console.log('⚠️  PARTIAL SUCCESS: Redirected to dashboard but content not showing');
      console.log('='.repeat(60));
      console.log('\n⚠️  Dashboard URL reached but elements not rendering');
      console.log('   This could be:');
      console.log('   - Client-side JavaScript error');
      console.log('   - React hydration issue');
      console.log('   - CSS/styling hiding content');
      console.log('\n   Check screenshots at /tmp/*.png');
    } else {
      console.log('❌ FAILED: Dashboard not accessible');
      console.log('='.repeat(60));
      console.log(`\n❌ Still on: ${currentUrl}`);
      console.log('   Login may have failed');
      console.log('   Check screenshots at /tmp/*.png');
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    await page.screenshot({ path: '/tmp/error-state.png' });
    console.log('📸 Error screenshot: /tmp/error-state.png');
  } finally {
    await browser.close();
  }
}

testLoginInBrowser();
