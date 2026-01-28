# Testing Guide

This guide covers testing practices and infrastructure for the Social Media Automation Platform.

## Overview

The project uses Jest as the primary testing framework for both backend and frontend:

- **Backend**: Jest + Supertest for API testing
- **Frontend**: Jest + React Testing Library for component testing

## Backend Testing

### Test Structure

```
backend/
├── tests/
│   ├── setup.ts                 # Test configuration and mocks
│   ├── unit/
│   │   └── controllers/         # Controller unit tests
│   │       ├── auth.controller.test.ts
│   │       └── video.controller.test.ts
│   └── integration/
│       └── api/                 # API integration tests
│           ├── auth.test.ts
│           └── videos.test.ts
├── jest.config.js              # Jest configuration
└── package.json
```

### Running Tests

```bash
cd backend

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in CI mode
npm run test:ci
```

### Coverage Thresholds

Backend coverage thresholds (configured in jest.config.js):

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Writing Backend Tests

#### Unit Test Example

```typescript
import { Request, Response } from 'express';
import { register } from '../../../src/controllers/auth.controller';
import { PrismaClient } from '@prisma/client';

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Auth Controller', () => {
  it('should register a new user successfully', async () => {
    const mockRequest = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      },
    } as Request;

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    await register(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
  });
});
```

#### Integration Test Example

```typescript
import request from 'supertest';
import { app } from '../../../src/app';

describe('Auth API Integration Tests', () => {
  it('should register a new user and return 201', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
  });
});
```

### Mocked Dependencies

The following dependencies are mocked in `tests/setup.ts`:

- **Prisma Client**: Database operations
- **Bull Queue**: Background jobs
- **AWS S3**: File storage
- **Redis**: Caching
- **FFmpeg**: Video processing

## Frontend Testing

### Test Structure

```
frontend/
├── tests/
│   ├── setup.ts                           # Test configuration
│   └── unit/
│       ├── lib/
│       │   └── store/
│       │       └── authStore.test.ts      # Zustand store tests
│       └── components/
│           └── video/
│               └── VideoCard.test.tsx     # Component tests
├── jest.config.js                         # Jest configuration
└── package.json
```

### Running Tests

```bash
cd frontend

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run tests in CI mode
npm run test:ci
```

### Coverage Thresholds

Frontend coverage thresholds (configured in jest.config.js):

- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%
- **Statements**: 60%

### Writing Frontend Tests

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from '../../../../src/components/video/VideoCard';

describe('VideoCard', () => {
  const mockVideo = {
    id: 'video-1',
    title: 'Test Video',
    status: 'READY',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
  };

  it('should render video card with title', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    render(<VideoCard video={mockVideo} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledWith('video-1');
  });
});
```

#### Store Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../../../src/lib/store/authStore';

describe('AuthStore', () => {
  it('should login user and set token', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login(
        { id: '1', name: 'Test', email: 'test@example.com' },
        'token'
      );
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Mocked Dependencies

The following are mocked in `tests/setup.ts`:

- **Next.js Router**: useRouter, usePathname, useSearchParams
- **Window APIs**: matchMedia, IntersectionObserver, ResizeObserver
- **Environment Variables**: NEXT_PUBLIC_API_URL, etc.

## CI/CD Integration

### GitHub Actions Workflows

#### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request:

1. **Backend**: Lint → Format check → Type check → **Tests** → Build
2. **Frontend**: Lint → Format check → Type check → **Tests** → Build
3. **Security Audit**: npm audit for both projects

#### 2. Test Coverage Pipeline (`.github/workflows/test-coverage.yml`)

Runs on push to main/develop and PRs:

1. Generates coverage reports
2. Uploads to Codecov (optional)
3. Adds coverage summary to GitHub Actions summary

### Running CI Locally

```bash
# Backend
cd backend
npm run lint
npm run format:check
npm run type-check
npm run test:ci
npm run build

# Frontend
cd frontend
npm run lint
npm run format:check
npm run type-check
npm run test:ci
npm run build
```

## Best Practices

### General

1. **Test Naming**: Use descriptive test names with "should" format
   - ✅ `should register a new user successfully`
   - ❌ `test register`

2. **Arrange-Act-Assert**: Follow the AAA pattern
   ```typescript
   // Arrange
   const mockData = { ... };

   // Act
   const result = await someFunction(mockData);

   // Assert
   expect(result).toBe(expected);
   ```

3. **One Assertion Per Test**: Focus on testing one behavior per test
4. **Mock External Dependencies**: Isolate the code under test
5. **Clean Up**: Use `beforeEach` and `afterEach` to reset state

### Backend-Specific

1. **Mock Database**: Always mock Prisma Client in unit tests
2. **Test Edge Cases**: Invalid inputs, missing fields, unauthorized access
3. **Test Error Handling**: Ensure proper error responses
4. **Test Rate Limiting**: Verify rate limits are enforced
5. **Integration Tests**: Test full request/response cycle

### Frontend-Specific

1. **Test User Interactions**: Use `fireEvent` or `userEvent`
2. **Query by Accessibility**: Prefer `getByRole`, `getByLabelText`
3. **Avoid Implementation Details**: Don't test internal state
4. **Test Loading States**: Verify loading indicators
5. **Test Error States**: Verify error messages display correctly

## Coverage Reports

### Viewing Coverage Locally

After running tests with coverage:

```bash
# Backend
cd backend
open coverage/lcov-report/index.html

# Frontend
cd frontend
open coverage/lcov-report/index.html
```

### Understanding Coverage Metrics

- **Lines**: Percentage of code lines executed
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of conditional branches taken (if/else, switch)
- **Functions**: Percentage of functions called

### Improving Coverage

1. **Identify Uncovered Code**: Check coverage reports
2. **Write Missing Tests**: Focus on untested branches
3. **Refactor Complex Code**: Break down large functions
4. **Remove Dead Code**: Delete unused code

## Troubleshooting

### Common Issues

#### "Cannot find module" errors

```bash
# Regenerate Prisma Client
cd backend
npx prisma generate
```

#### "TextEncoder is not defined" (Frontend)

Already handled in `tests/setup.ts` with polyfills.

#### Tests timing out

Increase timeout in jest.config.js:
```javascript
testTimeout: 10000, // 10 seconds
```

#### Flaky tests

- Avoid timing-dependent tests
- Use `waitFor` from Testing Library
- Mock timers with `jest.useFakeTimers()`

### Debugging Tests

```bash
# Run single test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Run with verbose output
npm test -- --verbose

# Debug in VS Code
# Add breakpoint and use "Jest: Debug" from command palette
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Next.js Testing](https://nextjs.org/docs/testing)

## Contributing

When submitting PRs:

1. Write tests for new features
2. Update existing tests if behavior changes
3. Ensure all tests pass locally
4. Maintain or improve coverage percentages
5. Follow existing test patterns

## Future Enhancements

- [ ] E2E tests with Playwright or Cypress
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing for APIs
- [ ] Contract testing for API integration
- [ ] Mutation testing with Stryker
