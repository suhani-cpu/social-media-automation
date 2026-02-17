const { chromium } = require('playwright');

async function testPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('Testing Videos page...');
    await page.goto('http://localhost:3001/dashboard/videos');
    await page.waitForTimeout(2000);
    console.log('Videos page URL:', page.url());

    console.log('\nTesting Posts page...');
    await page.goto('http://localhost:3001/dashboard/posts');
    await page.waitForTimeout(2000);
    console.log('Posts page URL:', page.url());

    console.log('\nErrors found:');
    if (errors.length > 0) {
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('  (none)');
    }

  } finally {
    await browser.close();
  }
}

testPages();
