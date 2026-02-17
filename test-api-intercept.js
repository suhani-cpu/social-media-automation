const { chromium } = require('playwright');

async function interceptLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pageInstance = await page.newPage();

  const apiCalls = [];

  // Intercept API calls
  pageInstance.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      apiCalls.push({
        url,
        status,
        body: await response.text().catch(() => 'Could not read body')
      });
    }
  });

  try {
    console.log('Testing login with API interception...\n');

    await pageInstance.goto('http://localhost:3001/login');

    await pageInstance.fill('input[type="email"]', 'suhani@stage.in');
    await pageInstance.fill('input[type="password"]', '123456');

    console.log('Clicking login...\n');
    await pageInstance.click('button[type="submit"]');

    await pageInstance.waitForTimeout(5000);

    console.log('API Calls Made:');
    apiCalls.forEach((call, i) => {
      console.log(`\n[${i + 1}] ${call.url}`);
      console.log(`    Status: ${call.status}`);
      console.log(`    Body: ${call.body.substring(0, 200)}`);
    });

    console.log('\n\nFinal URL:', pageInstance.url());

  } finally {
    await browser.close();
  }
}

interceptLogin();
