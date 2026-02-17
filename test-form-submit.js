const { chromium } = require('playwright');

async function testFormSubmit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console
  page.on('console', msg => console.log(`BROWSER: [${msg.type()}] ${msg.text()}`));

  try {
    await page.goto('http://localhost:3001/login');

    console.log('Filling form...');
    await page.fill('input[type="email"]', 'suhani@stage.in');
    await page.fill('input[type="password"]', '123456');

    console.log('\nChecking form validity...');
    const emailValue = await page.inputValue('input[type="email"]');
    const passwordValue = await page.inputValue('input[type="password"]');
    console.log(`Email filled: ${emailValue}`);
    console.log(`Password filled: ${passwordValue ? '******' : 'EMPTY'}`);

    // Check if button is enabled
    const buttonDisabled = await page.isDisabled('button[type="submit"]');
    console.log(`Button disabled: ${buttonDisabled}`);

    console.log('\nClicking submit...');
    await page.click('button[type="submit"]');

    // Wait and check
    await page.waitForTimeout(6000);

    console.log(`\nFinal URL: ${page.url()}`);

    // Check for any visible errors
    const errorElement = await page.locator('.text-destructive').count();
    if (errorElement > 0) {
      const errorText = await page.locator('.text-destructive').first().textContent();
      console.log(`Error shown: ${errorText}`);
    }

  } finally {
    await browser.close();
  }
}

testFormSubmit();
