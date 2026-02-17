# E2E Test Suite - Social Media Automation Platform

Comprehensive end-to-end test suite using Playwright for testing the Social Media Automation Platform.

## 📋 Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Architecture](#test-architecture)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Setup

### Prerequisites

- Node.js 22.13.1+ (check with `node --version`)
- npm or yarn
- Running backend (port 3000) and frontend (port 3001) servers
- Test database (PostgreSQL)
- Redis instance

### Installation

1. **Install Playwright and dependencies**

   ```bash
   npm run test:install
   ```

   This installs Playwright browsers and system dependencies.

2. **Configure test environment**

   Copy `.env.test` and fill in your test credentials:

   ```bash
   cp .env.test .env.test.local
   # Edit .env.test.local with your test values
   ```

   **Important**: Never use production credentials or databases for testing!

3. **Add test video files**

   Place test video files in `tests/support/fixtures/`:
   - `test-video.mp4` - Small video for quick tests (< 10MB)
   - `large-video.mp4` - Large video for file size limit tests (> 500MB)

4. **Set up test database**

   Create a separate test database:

   ```bash
   # Create test database
   createdb social_media_automation_test

   # Run migrations (from backend directory)
   cd backend
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_media_automation_test" npx prisma migrate deploy
   ```

---

## 🧪 Running Tests

### Local Development

**Run all tests:**
```bash
npm run test:e2e
```

**Run with UI (interactive mode):**
```bash
npm run test:e2e:ui
```

**Run in headed mode (see browser):**
```bash
npm run test:e2e:headed
```

**Debug mode (step through tests):**
```bash
npm run test:e2e:debug
```

**Run specific browser:**
```bash
npm run test:e2e:chrome
```

**Run specific test file:**
```bash
npx playwright test tests/e2e/auth.spec.ts
```

**Run tests matching pattern:**
```bash
npx playwright test -g "should login"
```

### View Test Results

After tests run, view the HTML report:

```bash
npm run test:e2e:report
```

Artifacts (screenshots, videos, traces) are saved in `test-results/`.

---

## 🏗️ Test Architecture

### Directory Structure

```
tests/
├── e2e/                          # End-to-end UI tests
│   ├── auth.spec.ts              # Authentication flows
│   ├── video-upload.spec.ts      # Video upload/processing
│   └── social-media.spec.ts      # Social media posting
├── api/                          # API integration tests
│   ├── posts.spec.ts             # Posts API
│   └── accounts.spec.ts          # Account management API
├── support/                      # Test infrastructure
│   ├── fixtures/                 # Test data and custom fixtures
│   │   ├── index.ts              # Main fixture exports
│   │   ├── factories/            # Data factories
│   │   │   ├── user-factory.ts   # Create test users
│   │   │   ├── video-factory.ts  # Upload test videos
│   │   │   └── post-factory.ts   # Create test posts
│   │   └── test-video.mp4        # Sample video file
│   ├── helpers/                  # Utility functions
│   │   ├── auth-helper.ts        # Authentication utilities
│   │   └── api-client.ts         # API request wrapper
│   └── page-objects/             # Page object models (optional)
└── README.md                     # This file
```

### Fixture Pattern

Tests use custom fixtures for common setup/teardown:

```typescript
import { test, expect } from '../support/fixtures';

test('example', async ({ authenticatedPage, userFactory, videoFactory }) => {
  // `authenticatedPage` is pre-logged in
  // `userFactory` creates users with auto-cleanup
  // `videoFactory` uploads videos with auto-cleanup
});
```

**Available Fixtures:**

- `userFactory` - Create test users
- `videoFactory` - Upload test videos
- `postFactory` - Create test posts
- `authHelper` - Authentication utilities
- `apiClient` - Authenticated API client
- `authenticatedPage` - Pre-authenticated user page
- `adminPage` - Pre-authenticated admin page

### Data Factories

Factories create test data and automatically clean up after tests:

```typescript
// Create user
const user = await userFactory.createUser({
  email: 'custom@example.com',
  name: 'Custom Name'
});

// Upload video
const video = await videoFactory.uploadVideo({
  title: 'My Test Video',
  authToken: token
});

// Wait for video processing
const processedVideo = await videoFactory.waitForProcessing(video.id, token);

// Create post
const post = await postFactory.createPost({
  videoId: video.id,
  caption: 'Test caption',
  platforms: ['INSTAGRAM', 'FACEBOOK']
});

// Cleanup happens automatically after test
```

---

## ✍️ Writing Tests

### Test Structure

```typescript
import { test, expect } from '../support/fixtures';

test.describe('Feature Name', () => {
  test('should do something', async ({ page, userFactory }) => {
    // Arrange: Set up test data
    const user = await userFactory.createUser();

    // Act: Perform actions
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', user.email);
    await page.click('[data-testid="login-button"]');

    // Assert: Verify results
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

### Selector Strategy

**Always use `data-testid` attributes:**

```typescript
// ✅ Good - Stable, semantic
await page.click('[data-testid="login-button"]');

// ❌ Bad - Brittle, breaks with styling changes
await page.click('.btn-primary.login-btn');
```

**Adding data-testid to components:**

```tsx
// In your React/Next.js components
<button data-testid="login-button">Login</button>
<input data-testid="email-input" type="email" />
```

### Authentication

**Option 1: Use authenticated fixture**
```typescript
test('test requiring auth', async ({ authenticatedPage: page }) => {
  // Already logged in
  await page.goto('/dashboard');
});
```

**Option 2: Login via helper**
```typescript
test('manual login', async ({ page, authHelper }) => {
  await authHelper.loginAsTestUser();
  await page.goto('/dashboard');
});
```

**Option 3: API login (fastest)**
```typescript
test('api login', async ({ page, userFactory }) => {
  const user = await userFactory.createUser();
  const token = await userFactory.getAuthToken(user.email, user.password);

  // Set token in browser
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('authToken', t), token);
  await page.goto('/dashboard');
});
```

### API Testing

```typescript
test('API test', async ({ apiClient, userFactory }) => {
  // Get auth token
  const user = await userFactory.createUser();
  const token = await userFactory.getAuthToken(user.email, user.password);
  apiClient.setAuthToken(token);

  // Make API request
  const response = await apiClient.get('/posts');
  await apiClient.assertResponseOk(response);

  const data = await response.json();
  expect(data.posts).toHaveLength(0);
});
```

---

## 📝 Best Practices

### 1. Test Isolation

**Each test must be independent:**

```typescript
// ✅ Good - Creates own data
test('test 1', async ({ userFactory }) => {
  const user = await userFactory.createUser();
  // Test logic
});

// ❌ Bad - Shares data between tests
const sharedUser = { email: 'shared@example.com' };
test('test 2', async ({ page }) => {
  // Uses shared data - breaks isolation
});
```

### 2. Auto-Cleanup

Factories handle cleanup automatically. No manual cleanup needed:

```typescript
test('auto cleanup', async ({ userFactory, videoFactory }) => {
  const user = await userFactory.createUser();
  const video = await videoFactory.uploadVideo({ authToken: token });

  // No cleanup needed - happens automatically
});
```

### 3. Explicit Waits

Use Playwright's auto-waiting, but be explicit when needed:

```typescript
// ✅ Good - Explicit wait with timeout
await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });

// ❌ Bad - Implicit wait may timeout
await page.click('[data-testid="button"]');
expect(page.locator('[data-testid="result"]')).toBeVisible();
```

### 4. Meaningful Test Names

```typescript
// ✅ Good - Describes behavior
test('should redirect to dashboard after successful login', async () => {});

// ❌ Bad - Vague
test('login test', async () => {});
```

### 5. Test Data

Use realistic data with factories:

```typescript
// ✅ Good - Realistic, unique data
const user = await userFactory.createUser({
  email: `testuser-${Date.now()}@example.com`
});

// ❌ Bad - Hardcoded, may conflict
const user = { email: 'test@example.com' };
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Example workflow configuration:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npm run test:install

      - name: Run database migrations
        run: cd backend && npx prisma migrate deploy

      - name: Start servers
        run: |
          npm run backend:start &
          npm run frontend:start &

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## 🐛 Troubleshooting

### Tests Failing Locally

**1. Check servers are running:**
```bash
# Backend should be on port 3000
curl http://localhost:3000/health

# Frontend should be on port 3001
curl http://localhost:3001
```

**2. Verify test database:**
```bash
# Check database exists
psql -l | grep social_media_automation_test
```

**3. Clear test data:**
```bash
# Reset test database
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/social_media_automation_test" npx prisma migrate reset --force
```

### Slow Tests

**1. Run fewer browsers:**
```bash
# Run only Chromium
npx playwright test --project=chromium
```

**2. Disable video recording:**
```typescript
// In playwright.config.ts
video: 'off', // Instead of 'retain-on-failure'
```

**3. Use API for setup:**
```typescript
// Faster than UI login
const token = await userFactory.getAuthToken(email, password);
await page.evaluate((t) => localStorage.setItem('authToken', t), token);
```

### Debugging Failing Tests

**1. Run in headed mode:**
```bash
npm run test:e2e:headed
```

**2. Use debug mode:**
```bash
npm run test:e2e:debug
```

**3. Check trace viewer:**
```bash
# After test failure
npx playwright show-trace test-results/path-to-trace.zip
```

**4. Add console logs:**
```typescript
test('debug test', async ({ page }) => {
  page.on('console', msg => console.log('Browser:', msg.text()));
  // Test logic
});
```

### Common Issues

**"Timeout waiting for selector"**
- Element may not exist or take longer to load
- Increase timeout: `{ timeout: 30000 }`
- Check data-testid is correct

**"Test data already exists"**
- Ensure factories use unique data (timestamps, random IDs)
- Reset test database between runs

**"Authentication failed"**
- Check TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test
- Verify user exists in test database
- Check JWT_SECRET matches backend config

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles/)

---

## 🤝 Contributing

When adding new tests:

1. Follow the existing fixture pattern
2. Use data-testid selectors
3. Ensure test isolation with factories
4. Add descriptive test names
5. Update this README if adding new patterns

---

**Last Updated**: 2026-02-03
