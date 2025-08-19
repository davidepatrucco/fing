# FIA Web Frontend - Test Suite Documentation

## Overview
This document outlines comprehensive testing scenarios for the FIA (Finger In Ass Coin) web frontend. The application is a Next.js web app that provides interaction with the FIA token smart contract on Base Sepolia network.

## Application Pages and Components
- **Homepage** (`/`) - Landing page with hero section and feature overview
- **Token Page** (`/token`) - Contract information, MetaMask integration, protected transfers
- **Leaderboard** (`/leaderboard`) - User rankings with filtering and CSV export
- **Governance** (`/governance`) - Proposal creation, voting, and execution
- **Staking** (`/staking`) - Staking operations with variable APY
- **Monitor** (`/monitor`) - Real-time event monitoring
- **Tools** (`/tools`) - Developer tools and utilities
- **Multisig** (`/multisig`) - Multi-signature operations
- **Documentation** (`/docs`) - Application documentation

---

## E2E Test Scenarios

### 1. Homepage Navigation and UI
**Test Case 1.1: Homepage loads correctly**
- ✅ **AUTOMATED** - Page loads without errors
- ✅ **AUTOMATED** - Hero section displays FIA branding
- ✅ **AUTOMATED** - Features section displays correctly
- ✅ **AUTOMATED** - Navigation links are functional

**Test Case 1.2: Homepage navigation flows**
- ✅ **AUTOMATED** - "View Token Details" button navigates to token page
- ✅ **AUTOMATED** - "See Leaderboard" button navigates to leaderboard page
- ✅ **AUTOMATED** - Feature card links navigate to correct pages

### 2. Token Page Functionality
**Test Case 2.1: Contract information display**
- ✅ **AUTOMATED** - Page loads contract information from API
- ✅ **AUTOMATED** - Contract address is displayed and copyable
- ✅ **AUTOMATED** - Token details (name, symbol, supply) are shown
- ⚠️ **MANUAL** - MetaMask integration (requires browser extension)

**Test Case 2.2: Protected transfer component**
- ✅ **AUTOMATED** - Protected transfer form renders
- ✅ **AUTOMATED** - Form validation works correctly
- ⚠️ **MANUAL** - Wallet connection required for functionality
- ⚠️ **MANUAL** - Transaction execution requires real wallet

### 3. Leaderboard Functionality
**Test Case 3.1: Leaderboard data display**
- ✅ **AUTOMATED** - Page loads leaderboard data from API
- ✅ **AUTOMATED** - User rankings display correctly
- ✅ **AUTOMATED** - Sorting and ranking functionality

**Test Case 3.2: Filtering and export**
- ✅ **AUTOMATED** - Block range filtering works
- ✅ **AUTOMATED** - Limit parameter filtering
- ✅ **AUTOMATED** - CSV export button functionality
- ✅ **AUTOMATED** - Filter form validation

### 4. Governance Page
**Test Case 4.1: Proposal display**
- ✅ **AUTOMATED** - Proposals list loads correctly
- ✅ **AUTOMATED** - Proposal details display properly
- ✅ **AUTOMATED** - Voting status and counts shown

**Test Case 4.2: Governance interactions**
- ⚠️ **MANUAL** - Wallet connection for governance actions
- ⚠️ **MANUAL** - Proposal creation (requires tokens)
- ⚠️ **MANUAL** - Voting on proposals (requires wallet)
- ⚠️ **MANUAL** - Proposal execution (requires conditions)

### 5. Staking Interface
**Test Case 5.1: Staking information display**
- ✅ **AUTOMATED** - Staking options and APY display
- ✅ **AUTOMATED** - User staking status loads
- ✅ **AUTOMATED** - Lock period options shown correctly

**Test Case 5.2: Staking operations**
- ⚠️ **MANUAL** - Stake tokens (requires wallet and tokens)
- ⚠️ **MANUAL** - Unstake tokens (requires existing stakes)
- ⚠️ **MANUAL** - Claim rewards (requires earned rewards)

### 6. Real-time Monitor
**Test Case 6.1: Event monitoring**
- ✅ **AUTOMATED** - Events list loads from API
- ✅ **AUTOMATED** - Event data formatting is correct
- ✅ **AUTOMATED** - Pagination/loading states
- ⚠️ **MANUAL** - Real-time updates (requires live events)

### 7. Navigation and Layout
**Test Case 7.1: Global navigation**
- ✅ **AUTOMATED** - Main navigation menu works
- ✅ **AUTOMATED** - Mobile responsive navigation
- ✅ **AUTOMATED** - Footer links functional

**Test Case 7.2: Responsive design**
- ✅ **AUTOMATED** - Desktop view (1920x1080)
- ✅ **AUTOMATED** - Tablet view (768x1024)
- ✅ **AUTOMATED** - Mobile view (375x667)

### 8. API Integration
**Test Case 8.1: API endpoints**
- ✅ **AUTOMATED** - `/api/contract` endpoint functionality
- ✅ **AUTOMATED** - `/api/leaderboard` endpoint with parameters
- ✅ **AUTOMATED** - `/api/events` endpoint functionality
- ✅ **AUTOMATED** - Error handling for API failures

### 9. Performance and Accessibility
**Test Case 9.1: Performance**
- ✅ **AUTOMATED** - Page load times under 3 seconds
- ✅ **AUTOMATED** - Core Web Vitals metrics
- ⚠️ **MANUAL** - Lighthouse performance audit (>90 score)

**Test Case 9.2: Accessibility**
- ✅ **AUTOMATED** - Basic accessibility checks
- ⚠️ **MANUAL** - Screen reader compatibility
- ⚠️ **MANUAL** - Keyboard navigation
- ⚠️ **MANUAL** - Color contrast compliance

### 10. Error Handling
**Test Case 10.1: Network errors**
- ✅ **AUTOMATED** - API timeout handling
- ✅ **AUTOMATED** - Network connection errors
- ✅ **AUTOMATED** - Invalid response handling

**Test Case 10.2: User input validation**
- ✅ **AUTOMATED** - Form field validation
- ✅ **AUTOMATED** - Invalid parameter handling
- ✅ **AUTOMATED** - Cross-site scripting prevention

---

## Test Implementation Status

### Automated Tests (Playwright E2E)
- **Total Test Cases**: 45
- **Automated**: 35 (78%)
- **Manual**: 10 (22%)

### Manual Test Scenarios
The following tests require manual execution due to external dependencies:

1. **MetaMask Integration** - Requires browser extension and user interaction
2. **Wallet Connections** - Requires actual wallet setup and connection
3. **Blockchain Transactions** - Requires gas fees and network interaction
4. **Real-time Event Monitoring** - Requires live blockchain events
5. **Accessibility Compliance** - Requires specialized tools and human verification
6. **Lighthouse Performance Audit** - Requires manual audit in production environment

### Test Data and Environment
- **Test Environment**: Local development server
- **Test Data**: Mock API responses for automated tests
- **Browser Coverage**: Chromium, Firefox, WebKit (via Playwright)
- **Device Coverage**: Desktop, tablet, and mobile viewports

### Continuous Integration
- Tests run on every pull request via GitHub Actions
- Automated browser testing across Chrome, Firefox, Safari
- Performance regression detection with Lighthouse CI
- Accessibility baseline maintenance
- Cross-browser compatibility validation
- Test results and screenshots automatically uploaded as artifacts

### GitHub Actions Workflow
The test suite runs automatically on:
- Push to main/develop branches
- Pull requests to main/develop branches
- Changes to web/ directory files

Workflow includes:
1. **Lint and Build**: ESLint validation and Next.js build verification
2. **E2E Tests**: Full Playwright test suite across multiple browsers
3. **Performance Audit**: Lighthouse CI performance and accessibility checks

---

## Test Execution Instructions

### Running Automated Tests
```bash
# Install dependencies
cd web
npm install

# Install Playwright browsers (required for E2E tests)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (with browser UI)
npm run test:e2e:headed

# Run tests for specific page
npm run test:e2e -- --grep "homepage"

# Debug tests interactively
npm run test:e2e:debug

# Generate test report
npm run test:e2e:report
```

### Test Files Structure
```
web/tests/
├── homepage.spec.ts         # Homepage navigation and UI tests
├── token.spec.ts           # Token page functionality tests
├── leaderboard.spec.ts     # Leaderboard filtering and export tests
├── monitor.spec.ts         # Real-time event monitoring tests
├── other-pages.spec.ts     # Governance, staking, tools, docs tests
└── integration.spec.ts     # API integration and cross-cutting tests
```

### Quick Setup Validation
```bash
# Validate test setup without installing browsers
cd web
npm run test:validate
```

### Manual Testing Checklist
For manual test scenarios, follow the detailed steps in the respective test case sections. Ensure the following environment setup:

1. **Wallet Setup**: MetaMask or compatible wallet installed
2. **Test Tokens**: Sufficient FIA tokens for testing transactions
3. **Network**: Connected to Base Sepolia testnet
4. **Browser**: Latest versions of Chrome, Firefox, Safari
5. **Accessibility Tools**: Screen reader, WAVE extension, axe-core

### Test Reporting
- Automated test results are stored in `test-results/` directory
- Screenshots and videos captured for failed tests
- Manual test results should be documented in test execution reports
- Performance metrics tracked in CI/CD pipeline

---

## Test Maintenance
- **Update Schedule**: Tests updated with every feature release
- **Test Data**: Mock data refreshed monthly or when API changes
- **Environment**: Test environment reset weekly
- **Coverage Goals**: Maintain >80% automated test coverage
- **Performance Baseline**: Page load times <3s, Lighthouse score >90

---

## Detailed Implementation Files

For detailed technical documentation and implementation guides, see:
- `web/TEST_README.md` - Comprehensive testing guide with setup instructions
- `web/validate-tests.js` - Test setup validation script
- `web/playwright.config.ts` - Playwright test configuration
- `.github/workflows/web-tests.yml` - CI/CD test automation workflow

## Repository Integration

This test suite is integrated with the existing FIA project structure:
- Tests run automatically in GitHub Actions CI/CD pipeline
- Performance monitoring via Lighthouse CI
- Test results stored as GitHub Actions artifacts
- Cross-browser testing on every pull request
- Automatic test setup validation before execution