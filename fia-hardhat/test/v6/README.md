# FIACoin V6 Test Suite

Comprehensive test coverage for FIACoin V6 smart contracts.

## 📁 Directory Structure

### `core/` - Production-Ready Tests ✅
These tests are fully working and provide comprehensive coverage:

- **fia-v6.analytics-getters.test.ts** - Tests for analytics getter functions (15 tests)
  - `stakingAPY` mapping access
  - `getStakeCount` functionality
  - `calculateRewards` with time progression
  - `getVotingPower` calculations

- **fia-v6.integration.test.ts** - Complex integration scenarios (12 tests)
  - Governance + staking integration
  - Multi-user staking scenarios
  - Fee distribution and analytics
  - Emergency scenarios and recovery
  - Gas optimization and performance
  - State transitions and edge cases

- **combined-working-tests.ts** - Imports both core test files for coverage analysis

### `incomplete/` - Tests Needing Fixes ⚠️
These tests have identified issues and need debugging:

- **fia-v6.advanced-transfers.test.ts** - Advanced transfer functionality tests
- **fia-v6.edge-cases.test.ts** - Edge cases and error condition testing

## 📊 Current Coverage

Running the core tests achieves:
- **73.05% statement coverage** on FIACoinV6.sol
- **74.19% function coverage**
- **75.65% line coverage**
- **27 passing tests** total

## 🚀 Running Tests

### Run Core Working Tests
```bash
npx hardhat test test/v6/core/
```

### Run Specific Test File
```bash
npx hardhat test test/v6/core/fia-v6.analytics-getters.test.ts
npx hardhat test test/v6/core/fia-v6.integration.test.ts
```

### Coverage Analysis
```bash
npx hardhat coverage --testfiles "test/v6/core/combined-working-tests.ts"
```

### Run All V6 Tests (including incomplete)
```bash
npx hardhat test test/v6/
```

## 🔧 Test Environment Setup

### Local Development
```bash
./setup-env.sh local
npm test
```

### Staging Environment
```bash
./setup-env.sh staging
npx hardhat test --network base-sepolia
```
```

### Coverage Analysis
```bash
npx hardhat coverage --testfiles "test/v6/fia-v6.basic.test.ts" --testfiles "test/v6/fia-v6.fees.test.ts" --testfiles "test/v6/fia-v6.staking.complete.test.ts" --testfiles "test/v6/fia-v6.final-100-coverage.test.ts" --testfiles "test/v6/fia-v6.final-coverage.test.ts" --testfiles "test/v6/fia-v6.missing-coverage.test.ts" --testfiles "test/v6/e2e.v6.admin.usecases.test.ts" --testfiles "test/v6/fia-v6.governance.negative.test.ts" --testfiles "test/v6/fia-v6.special-transfers.test.ts" --testfiles "test/v6/e2e.v6.transfers.four-parties.test.ts" --testfiles "test/v6/fia-v6.pause.coverage.test.ts" --testfiles "test/v6/fia-v6.transfer.limits.test.ts" --testfiles "test/v6/fia-v6.transfers.limits.analytics.test.ts" --testfiles "test/v6/batch.exempt.v6.test.ts"
```
