import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env.test' });

/**
 * Playwright Test Configuration
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Test pattern matching
  testMatch: '**/*.spec.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Timeouts
  timeout: 60 * 1000, // Test timeout: 60s
  expect: {
    timeout: 15 * 1000, // Assertion timeout: 15s
  },

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3001',

    // Collect trace when retrying the failed test
    trace: 'retain-on-failure',

    // Screenshot on failure only
    screenshot: 'only-on-failure',

    // Record video on failure only
    video: 'retain-on-failure',

    // Action and navigation timeouts
    actionTimeout: 15 * 1000, // 15s
    navigationTimeout: 30 * 1000, // 30s

    // Emulate browser locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use data-testid for selectors
        testIdAttribute: 'data-testid',
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        testIdAttribute: 'data-testid',
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        testIdAttribute: 'data-testid',
      },
    },

    // Mobile viewports for testing responsive design
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        testIdAttribute: 'data-testid',
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        testIdAttribute: 'data-testid',
      },
    },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if you want Playwright to start the servers automatically
  // webServer: [
  //   {
  //     command: 'npm run backend:dev',
  //     url: 'http://localhost:3000/health',
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'npm run frontend:dev',
  //     url: 'http://localhost:3001',
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],

  // Output folder for test artifacts
  outputDir: 'test-results/artifacts',
});
