# 🧪 FIACoin Test Suite Organization

This directory contains the reorganized test suite for the FIACoin project, structured by version and purpose for better maintainability and clarity.

## 📁 Directory Structure

```
test/
├── README.md                    # This file
├── v6/                         # ✅ FIACoin V6 Tests (Current Production)
├── v7/                         # 🚀 FIACoin V7 Tests (Proxy Pattern)
├── auxiliary/                  # 🔧 Supporting Contract Tests
└── helpers/                    # 📚 Test Utilities and Helpers
```

---

## ✅ V6 Tests (`/v6/`)

**Current production version tests** - All tests in this folder are **actively maintained** and **passing**.

### Core Functionality
- `fia-v6.basic.test.ts` - Basic deployment, transfer, and token functionality
- `fia-v6.fees.test.ts` - Fee system, distribution, and burn mechanics
- `fia-v6.staking.complete.test.ts` - Complete staking system with all lock periods

### Advanced Features
- `fia-v6.special-transfers.test.ts` - Protected transfers, batch ops, transfer with data
- `fia-v6.transfers.limits.analytics.test.ts` - Transaction limits and analytics
- `fia-v6.transfer.limits.test.ts` - maxTx and maxWallet enforcement

### Governance & Security
- `fia-v6.governance.negative.test.ts` - Governance edge cases and failure modes
- `fia-v6.pause.coverage.test.ts` - Emergency pause functionality
- `fiacoinv6-executor.test.js` - Executor role and governance execution

### Coverage & Edge Cases
- `fia-v6.final-100-coverage.test.ts` - Final coverage tests for 100% coverage
- `fia-v6.final-coverage.test.ts` - Additional coverage for edge cases
- `fia-v6.missing-coverage.test.ts` - Previously missing branch coverage

### E2E & Integration
- `e2e.v6.admin.usecases.test.ts` - Comprehensive admin and management scenarios
- `e2e.v6.transfers.four-parties.test.ts` - Multi-party transfer workflows
- `e2e.reentrancy.test.ts` - Reentrancy protection validation

### Fee System
- `batch.exempt.v6.test.ts` - Fee exemption system for V6

### Test Results
```
✅ 15+ core tests passing
📊 95.04% statement coverage
🎯 72.08% branch coverage
🔧 90.32% function coverage
📈 92.75% line coverage
```

---

## 🚀 V7 Tests (`/v7/`)

**Next generation proxy-based upgradeable version** - Future upgrade tests.

### Proxy Pattern Implementation
- `proxy-pattern.test.ts` - OpenZeppelin UUPS proxy upgrade system
  - V6 → V7 seamless upgrades
  - State preservation validation
  - Upgrade authorization security
  - Zero-friction user experience

### Features
- Proxy deployment and initialization
- Seamless contract upgrades
- State preservation across upgrades
- Security controls for upgrade authorization

---

## ❌ Deprecated Tests (Removed)

**Obsolete tests have been removed** to clean up the codebase. Previously contained V5 and legacy tests that no longer work with current contracts.

### What was removed:
- V5 comprehensive tests
- Legacy FIACoin tests  
- Old fee system tests
- Obsolete E2E tests for V5
- Edge case tests for deprecated versions

**⚠️ Note**: These tests were removed because they referenced `FIACoinV5` and other non-existent contracts. If needed for reference, they can be recovered from git history.

---

## 🔧 Auxiliary Tests (`/auxiliary/`)

**Supporting contract tests** - Tests for helper contracts and integrations.

### MultiSig System
- `simpleMultisig.test.js` - Basic multisig functionality
- `multisig.edgecases.test.ts` - Edge cases and security scenarios
- `e2e.multisig.test.ts` - End-to-end multisig workflows

### Timelock & LP
- `e2e.lptimelock.test.ts` - LP token timelock functionality
- `e2e.lp.*.test.ts` - Liquidity provider related tests

### DEX Integration
- `e2e.uniswap.mock.test.ts` - Mock DEX integration tests

---

## 📚 Helpers (`/helpers/`)

**Test utilities and shared helpers** - Reusable test components.

Currently contains shared test setup and utility functions used across test suites.

---

## 🏃‍♂️ Running Tests

### Run All V6 Tests (Recommended)
```bash
npx hardhat test test/v6/
```

### Run Specific V6 Test Categories
```bash
# Core functionality
npx hardhat test test/v6/fia-v6.basic.test.ts test/v6/fia-v6.fees.test.ts

# Staking system
npx hardhat test test/v6/fia-v6.staking.complete.test.ts

# Coverage tests
npx hardhat test test/v6/fia-v6.final-100-coverage.test.ts

# Admin functionality
npx hardhat test test/v6/e2e.v6.admin.usecases.test.ts
```

### Run V7 Proxy Tests
```bash
npx hardhat test test/v7/
```

### Run Auxiliary Tests
```bash
npx hardhat test test/auxiliary/
```

### Coverage Analysis (V6 Only)
```bash
npx hardhat coverage --testfiles "test/v6/*.ts"
```

---

## 📊 Test Status Summary

| Category | Status | Count | Coverage |
|----------|--------|-------|----------|
| **V6 Tests** | ✅ Active | 15+ | 95%+ |
| **V7 Tests** | 🚀 Future | 1 | New |
| **Auxiliary** | 🔧 Helper | 6 | Variable |

---

## 🔮 Future Organization

As new versions are developed, follow this pattern:

### For V8 (Future)
```bash
mkdir test/v8/
# Move V8-specific tests here
```

### For Major Refactors
```bash
mkdir test/deprecated/v6/
# Move old V6 tests here when V8 becomes production
mv test/v6/* test/deprecated/v6/
```

---

## 🚨 Important Notes

1. **Only run V6 tests** for current development
2. **V7 tests require** proxy setup and may need additional configuration
3. **Always use** `test/v6/` for active development testing
4. **Coverage reports** should target `test/v6/` only
5. **Auxiliary tests** are for supporting contracts only

---

## 🎯 Quick Commands Reference

```bash
# Main production test suite
npx hardhat test test/v6/

# Check test organization
ls -la test/*/

# Run coverage on current version
npx hardhat coverage --testfiles "test/v6/*.ts"

# Test specific functionality
npx hardhat test test/v6/fia-v6.basic.test.ts

# Future proxy tests
npx hardhat test test/v7/proxy-pattern.test.ts
```

---

*Last Updated: August 19, 2025*  
*Organization: Version-based test structure*  
*Status: ✅ V6 Active, 🚀 V7 Ready, ❌ V5 Deprecated*
