# FIACoin V6 Test Runner

A utility script to run V6 tests easily.

## Quick Commands

### Core Tests
```bash
npx hardhat test test/v6/fia-v6.basic.test.ts test/v6/fia-v6.fees.test.ts test/v6/fia-v6.staking.complete.test.ts
```

### Coverage Tests  
```bash
npx hardhat test test/v6/fia-v6.final-100-coverage.test.ts test/v6/fia-v6.final-coverage.test.ts test/v6/fia-v6.missing-coverage.test.ts
```

### Admin & Governance
```bash
npx hardhat test test/v6/e2e.v6.admin.usecases.test.ts test/v6/fia-v6.governance.negative.test.ts
```

### Advanced Features
```bash
npx hardhat test test/v6/fia-v6.special-transfers.test.ts test/v6/e2e.v6.transfers.four-parties.test.ts
```

### Security & Limits
```bash
npx hardhat test test/v6/fia-v6.pause.coverage.test.ts test/v6/fia-v6.transfer.limits.test.ts
```

### All V6 Tests (Individual Files)
```bash
npx hardhat test \
  test/v6/fia-v6.basic.test.ts \
  test/v6/fia-v6.fees.test.ts \
  test/v6/fia-v6.staking.complete.test.ts \
  test/v6/fia-v6.final-100-coverage.test.ts \
  test/v6/fia-v6.final-coverage.test.ts \
  test/v6/fia-v6.missing-coverage.test.ts \
  test/v6/e2e.v6.admin.usecases.test.ts \
  test/v6/fia-v6.governance.negative.test.ts \
  test/v6/fia-v6.special-transfers.test.ts \
  test/v6/e2e.v6.transfers.four-parties.test.ts \
  test/v6/fia-v6.pause.coverage.test.ts \
  test/v6/fia-v6.transfer.limits.test.ts \
  test/v6/fia-v6.transfers.limits.analytics.test.ts \
  test/v6/batch.exempt.v6.test.ts \
  test/v6/fiacoinv6-executor.test.js \
  test/v6/e2e.reentrancy.test.ts
```

### Coverage Analysis
```bash
npx hardhat coverage --testfiles "test/v6/fia-v6.basic.test.ts" --testfiles "test/v6/fia-v6.fees.test.ts" --testfiles "test/v6/fia-v6.staking.complete.test.ts" --testfiles "test/v6/fia-v6.final-100-coverage.test.ts" --testfiles "test/v6/fia-v6.final-coverage.test.ts" --testfiles "test/v6/fia-v6.missing-coverage.test.ts" --testfiles "test/v6/e2e.v6.admin.usecases.test.ts" --testfiles "test/v6/fia-v6.governance.negative.test.ts" --testfiles "test/v6/fia-v6.special-transfers.test.ts" --testfiles "test/v6/e2e.v6.transfers.four-parties.test.ts" --testfiles "test/v6/fia-v6.pause.coverage.test.ts" --testfiles "test/v6/fia-v6.transfer.limits.test.ts" --testfiles "test/v6/fia-v6.transfers.limits.analytics.test.ts" --testfiles "test/v6/batch.exempt.v6.test.ts"
```
