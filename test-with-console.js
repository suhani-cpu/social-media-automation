const { chromium } = require('playwright');

async function testWithConsole() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  try {
    await page.goto('http://localhost:3001/login');
    console.log('=== Page loaded ===\n');

    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');

    console.log('=== Clicking submit ===\n');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(8000);

    console.log('\n=== Final URL ===');
    console.log(page.url());

  } finally {
    await browser.close();
  }
}

testWithConsole();
