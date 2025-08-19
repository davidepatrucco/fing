# FIA Web Frontend Testing

This directory contains comprehensive end-to-end tests for the FIA (Finger In Ass Coin) web frontend application.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Validate test setup (optional)
npm run test:validate

# 3. Install Playwright browsers
npx playwright install

# 4. Run all tests
npm run test:e2e
```

## Test Structure

### Test Files
- `tests/homepage.spec.ts` - Homepage navigation and UI tests
- `tests/token.spec.ts` - Token page functionality and MetaMask integration tests
- `tests/leaderboard.spec.ts` - Leaderboard filtering, export, and data display tests
- `tests/monitor.spec.ts` - Real-time event monitoring tests
- `tests/other-pages.spec.ts` - Governance, staking, tools, and documentation page tests
- `tests/integration.spec.ts` - API integration, performance, and cross-cutting concern tests

### Configuration
- `playwright.config.ts` - Playwright test configuration
- `lighthouserc.json` - Lighthouse CI configuration for performance testing
- `validate-tests.js` - Test setup validation script

## Available Scripts

```bash
# Test Execution
npm run test:e2e           # Run all E2E tests
npm run test:e2e:headed    # Run tests with browser UI visible
npm run test:e2e:debug     # Run tests in debug mode
npm run test:e2e:report    # Show test report

# Test Validation
npm run test:validate      # Validate test setup without running browsers

# Development
npm run dev               # Start development server
npm run build             # Build production version
npm run lint              # Run ESLint
```

## Test Coverage

### Automated Tests (35 test cases)
- ✅ Homepage navigation and UI components
- ✅ Token page contract information display
- ✅ Leaderboard filtering and CSV export
- ✅ Monitor page real-time event display
- ✅ API endpoint integration testing
- ✅ Responsive design across device sizes
- ✅ Error handling and edge cases
- ✅ Performance and accessibility basics
- ✅ Cross-browser compatibility

### Manual Tests (10 test cases)
- ⚠️ MetaMask wallet integration
- ⚠️ Blockchain transaction execution
- ⚠️ Real-time event monitoring with live data
- ⚠️ Governance proposal creation and voting
- ⚠️ Staking operations with actual tokens
- ⚠️ Accessibility compliance (screen readers)
- ⚠️ Lighthouse performance audit in production
- ⚠️ Security testing and penetration testing

## Browser Support

Tests run across multiple browsers:
- **Chromium** (Desktop Chrome)
- **Firefox** (Desktop Firefox)  
- **WebKit** (Desktop Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## CI/CD Integration

### GitHub Actions
The test suite runs automatically via GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Changes to files in the `web/` directory

### Workflow Steps
1. **Lint and Build** - ESLint validation and Next.js build verification
2. **E2E Tests** - Full Playwright test suite across multiple browsers
3. **Performance Audit** - Lighthouse CI performance and accessibility checks

### Artifacts
- Test reports and screenshots are automatically uploaded
- Performance metrics tracked over time
- Failed test artifacts retained for debugging

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
```bash
# Clone and navigate
git clone https://github.com/davidepatrucco/fing.git
cd fing/web

# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install

# Start development server
npm run dev

# In another terminal, run tests
npm run test:e2e
```

### Running Specific Tests
```bash
# Run tests for a specific page
npm run test:e2e -- --grep "homepage"
npm run test:e2e -- --grep "leaderboard"

# Run a specific test file
npm run test:e2e tests/token.spec.ts

# Run tests in specific browser
npm run test:e2e -- --project="chromium"
npm run test:e2e -- --project="Mobile Chrome"
```

### Debugging Tests
```bash
# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Run with verbose output
npm run test:e2e -- --reporter=list
```

## Test Data and Mocking

### API Mocking
Tests use Playwright's route interception to mock API responses:
- `/api/contract` - Contract information
- `/api/leaderboard` - Leaderboard data with filtering
- `/api/events` - Event monitoring data

### Mock Data Examples
```javascript
// Mock successful leaderboard response
await page.route('**/api/leaderboard*', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      {
        address: '0x1234567890123456789012345678901234567890',
        given: '1000.0',
        received: '500.0'
      }
    ])
  });
});
```

## Performance Testing

### Metrics Tracked
- Page load times (< 3 seconds target)
- Core Web Vitals (LCP, FID, CLS)
- Lighthouse scores (>90 target)
- Bundle size and optimization

### Lighthouse CI
Performance audits run automatically in CI with thresholds:
- Performance: >90 (warn)
- Accessibility: >90 (error)
- Best Practices: >80 (warn)
- SEO: >80 (warn)

## Accessibility Testing

### Automated Checks
- Basic accessibility structure validation
- Heading hierarchy verification
- Alt text presence on images
- Keyboard navigation support

### Manual Testing Required
- Screen reader compatibility testing
- Color contrast verification
- Focus management validation
- ARIA attributes correctness

## Troubleshooting

### Common Issues

**Browser installation fails:**
```bash
# Try installing specific browser
npx playwright install chromium

# Or install with dependencies
npx playwright install --with-deps
```

**Tests timeout:**
- Increase timeout in `playwright.config.ts`
- Check if development server is running
- Verify network connectivity

**API mocking not working:**
- Check route patterns match exactly
- Ensure mocks are set up before page navigation
- Verify response format matches expected data

**Screenshots missing:**
- Ensure `screenshot: 'only-on-failure'` in config
- Check `test-results/` directory permissions
- Verify storage space available

### Getting Help
- Check test output for detailed error messages
- Review screenshots in `test-results/` directory
- Use `--debug` mode to step through tests
- Check GitHub Actions logs for CI failures

## Contributing

### Adding New Tests
1. Create test file in `tests/` directory
2. Follow naming convention: `feature-name.spec.ts`
3. Use descriptive test names and group with `test.describe()`
4. Add both positive and negative test cases
5. Update this README if needed

### Test Guidelines
- Keep tests independent and isolated
- Use proper assertions with meaningful messages
- Mock external dependencies and APIs
- Test responsive design across viewports
- Include error handling test cases
- Maintain test data separately from test logic

### Review Checklist
- [ ] Tests pass locally
- [ ] Tests pass in CI
- [ ] Code coverage maintained
- [ ] Performance impact minimal
- [ ] Documentation updated
- [ ] Manual test cases identified for complex workflows