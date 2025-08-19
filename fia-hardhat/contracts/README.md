# FIACoin Smart Contracts

This directory contains all smart contracts for the FIACoin ecosystem, organized by functionality.

## 📁 Directory Structure

### `src/` - Core Contracts
- **FIACoinV6.sol** - Main FIACoin V6 implementation with governance, staking, and advanced features
- **FIACoinV6Upgradeable.sol** - Upgradeable version using OpenZeppelin UUPS proxy pattern  
- **FIACoinV7Upgradeable.sol** - Next version with additional features
- **interfaces/** - Contract interfaces and external protocol definitions

### `governance/` - Governance Contracts
- **SimpleMultiSig.sol** - Simple multi-signature wallet implementation
- **MockSafe.sol** - Mock Gnosis Safe for testing governance integration

### `testing/` - Test Helper Contracts
- **MockDEX.sol** - Mock DEX for testing trading scenarios
- **MockToken.sol** - Simple ERC20 for testing interactions
- **TestCaller.sol** - Helper for testing function calls
- **TestProtectedCaller.sol** - Helper for testing protected functions
- **ReentrantReceiver.sol** - Contract for testing reentrancy protection

### `utils/` - Utility Contracts
- **LPTimelock.sol** - Timelock for liquidity provider tokens
- **NFTTimelock.sol** - Timelock for NFT-based governance
- **FIACoinMigration.sol** - Migration utilities for version upgrades

## 🔧 Usage

### Compilation
```bash
npx hardhat compile
```

### Testing
```bash
# Test specific contract
npx hardhat test test/v6/core/

# Run all tests
npx hardhat test
```

### Deployment
```bash
# Local development
./setup-env.sh local
npx hardhat run scripts/deployment/deploy.ts

# Staging (Base Sepolia)
./setup-env.sh staging
npx hardhat run scripts/deployment/deploy.ts --network base-sepolia

# Production (Base Mainnet)
./setup-env.sh production
npx hardhat run scripts/deployment/deploy.ts --network base
```

## 📋 Contract Dependencies

- **OpenZeppelin Contracts** - For standard ERC20, access control, and proxy patterns
- **Uniswap V3** - For DEX integration and liquidity management
- **Gnosis Safe** - For governance and treasury management

## 🔍 Verification

After deployment, verify contracts on Basescan:
```bash
npx hardhat run scripts/deployment/verify.ts --network <network>
```
