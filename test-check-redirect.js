const { chromium } = require('playwright');

async function checkRedirect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // Intercept all navigations
  const navigations = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      navigations.push(frame.url());
    }
  });

  try {
    await page.goto('http://localhost:3001/login');
    console.log('Initial URL:', page.url());

    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');

    console.log('\nClicking submit...');
    await page.click('button[type="submit"]');

    // Wait longer
    await page.waitForTimeout(10000);

    console.log('\nAll navigations:');
    navigations.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

    console.log('\nFinal URL:', page.url());

    console.log('\nConsole logs:');
    logs.forEach(log => console.log(`  ${log}`));

    // Try manual redirect
    console.log('\nTrying manual redirect via JavaScript...');
    await page.evaluate(() => {
      console.log('About to redirect...');
      window.location.href = '/dashboard';
    });

    await page.waitForTimeout(3000);
    console.log('URL after manual redirect:', page.url());

  } finally {
    await browser.close();
  }
}

checkRedirect();
