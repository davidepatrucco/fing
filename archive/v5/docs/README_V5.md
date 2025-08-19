# FIACoin v5 - Advanced DeFi Ecosystem Token

FIACoin v5 is a comprehensive DeFi ecosystem token with advanced governance, staking mechanisms, and community-driven features. This version introduces decentralized governance, yield farming capabilities, and enhanced utility functions while maintaining backward compatibility with v4.

## 🚀 Key Features

### 📊 Enhanced Tokenomics
- **Total Supply**: 1,000,000,000,000,000 FIA (1000T tokens) 
- **Fee-on-Transfer**: Configurable fees with treasury, founder, and burn distribution
- **Deflationary Mechanism**: Burn functionality reduces circulating supply

### 🗳️ Decentralized Governance
- **Token-weighted Voting**: 1 FIA = 1 vote
- **Proposal System**: Create and vote on proposals to change contract parameters
- **Time-locked Execution**: 48-hour delay for security
- **Multi-signature Support**: 3-of-5 multi-sig for critical operations
- **Quorum Requirements**: 10% of total supply must participate

### 💎 Staking System
- **Flexible Lock Periods**: 30, 90, 180, 365 days
- **Variable APY**: Higher rewards for longer lock periods
  - 30 days: 3% APY
  - 90 days: 5% APY
  - 180 days: 7% APY
  - 365 days: 9% APY
- **Auto-compound Option**: Automatic reward reinvestment
- **Early Withdrawal Penalty**: 10% penalty for early unstaking

### 🛠️ Utility Functions
- **Batch Operations**: Transfer to multiple recipients, batch staking
- **Advanced Transfers**: Transfers with data, scheduled transfers, recurring payments
- **Gas Optimization**: Up to 60% gas savings for multiple operations

### 🛡️ Anti-MEV Protection
- **Transaction Limits**: Maximum transaction and wallet amounts
- **Same-block Prevention**: Prevents sandwich attacks
- **Nonce-based Protection**: Prevents front-running
- **Cooldown Mechanisms**: Rate limiting for addresses

### 📊 Analytics & Monitoring
- **Real-time Metrics**: Live token and user statistics
- **On-chain Analytics**: Transaction counts, fee collection, burn tracking
- **User Statistics**: Individual transaction history and rewards
- **Leaderboards**: Top holders and stakers

### 🔌 DeFi Integrations
- **Yield Farming**: Auto-compound in external protocols (placeholder)
- **Lending/Borrowing**: Use FIA as collateral (placeholder)
- **Flash Loans**: Enable arbitrage opportunities (placeholder)
- **Cross-chain Support**: Bridge to Layer 2 networks (placeholder)

## 📋 Contract Details

### Core Constants
```solidity
uint256 public constant TOTAL_SUPPLY = 1_000_000_000_000_000 * 10**18;
uint256 public constant PROPOSAL_THRESHOLD = 1_000_000 * 10**18; // 1M FIA
uint256 public constant VOTING_PERIOD = 7 days;
uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total supply
uint256 public constant EXECUTION_DELAY = 48 hours;
```

### Staking Lock Periods
```solidity
uint256 public constant LOCK_30_DAYS = 30 days;   // 3% APY
uint256 public constant LOCK_90_DAYS = 90 days;   // 5% APY
uint256 public constant LOCK_180_DAYS = 180 days; // 7% APY
uint256 public constant LOCK_365_DAYS = 365 days; // 9% APY
```

## 🚀 Deployment Guide

### Prerequisites
```bash
npm install
```

### Local Deployment
```bash
npm run deploy:v5:local
```

### Testnet Deployment
```bash
# Set environment variables
export TREASURY_ADDRESS=0x...
export FOUNDER_ADDRESS=0x...
export FIA_V5_ADDRESS=0x...  # After deployment

# Deploy to Base Sepolia
npm run deploy:v5
```

## 📖 Usage Guide

### Basic Token Operations

#### Transfer Tokens
```solidity
// Regular transfer (with fees)
transfer(recipient, amount);

// Transfer with data
transferWithData(recipient, amount, data);

// Batch transfer
batchTransfer([recipient1, recipient2], [amount1, amount2]);
```

#### Protected Transfers (Anti-MEV)
```solidity
// Protected transfer with nonce
protectedTransfer(recipient, amount, nonce);
```

### Governance Operations

#### Creating Proposals
```bash
# Check governance status
npm run governance:status

# Create fee change proposal
npm run governance:create-proposal "Change fee to 0.5%" 0 "50"

# Create treasury spending proposal  
npm run governance:create-proposal "Fund development" 1 "0x...,10000"
```

#### Voting on Proposals
```bash
# Vote yes on proposal 0
npm run governance:vote 0 true

# Vote no on proposal 0
npm run governance:vote 0 false
```

#### Executing Proposals
```bash
# Execute proposal 0 (after voting period + delay)
npm run governance:execute 0
```

### Staking Operations

#### Stake Tokens
```bash
# Check staking status
npm run staking:status

# Stake 10,000 FIA for 90 days with auto-compound
npm run staking:stake 10000 90 true

# Stake 5,000 FIA for 365 days without auto-compound
npm run staking:stake 5000 365 false
```

#### Manage Stakes
```bash
# Unstake from stake index 0
npm run staking:unstake 0

# Claim rewards from stake index 0
npm run staking:claim-rewards 0

# Add rewards to the pool (owner only)
npm run staking:add-rewards 100000
```

### Batch Operations

#### Batch Transfer
```solidity
// Transfer to multiple recipients
string[] memory recipients = [addr1, addr2, addr3];
uint256[] memory amounts = [1000e18, 2000e18, 3000e18];
batchTransfer(recipients, amounts);
```

#### Batch Staking
```solidity
// Stake multiple amounts with different lock periods
uint256[] memory amounts = [1000e18, 2000e18];
uint256[] memory lockPeriods = [LOCK_30_DAYS, LOCK_365_DAYS];
batchStake(amounts, lockPeriods);
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run V5 Specific Tests
```bash
npm run test:v5
```

### Test Coverage Areas
- ✅ Deployment and initialization
- ✅ Governance system (proposals, voting, execution)
- ✅ Staking system (stake, unstake, rewards)
- ✅ Batch operations
- ✅ Anti-MEV protection
- ✅ Analytics tracking
- ✅ Fee system (legacy from v4)
- ✅ Advanced transfer features
- ✅ Emergency functions

## 🔧 Contract Functions

### Governance Functions
```solidity
function propose(string memory description, ProposalType pType, bytes memory data) external returns (uint256);
function vote(uint256 proposalId, bool support) external;
function execute(uint256 proposalId) external;
function getVotingPower(address account) external view returns (uint256);
```

### Staking Functions
```solidity
function stake(uint256 amount, uint256 lockPeriod, bool autoCompound) external;
function unstake(uint256 stakeIndex) external;
function claimRewards(uint256 stakeIndex) external;
function getStakingRewards(address user) external view returns (uint256);
```

### Batch Operations
```solidity
function batchTransfer(address[] memory recipients, uint256[] memory amounts) external returns (bool);
function batchSetFeeExempt(address[] memory accounts, bool exempt) external;
function batchStake(uint256[] memory amounts, uint256[] memory lockPeriods) external;
```

### Advanced Transfers
```solidity
function transferWithData(address to, uint256 amount, bytes memory data) external returns (bool);
function scheduledTransfer(address to, uint256 amount, uint256 executeTime) external returns (bytes32);
function recurringTransfer(address to, uint256 amount, uint256 interval, uint256 count) external returns (bytes32);
```

### Analytics Functions
```solidity
function getTokenStats() external view returns (TokenAnalytics memory);
function getUserStats(address user) external view returns (UserAnalytics memory);
function getTopHolders(uint256 count) external view returns (address[] memory, uint256[] memory);
function getStakingLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory);
```

## 🔒 Security Features

### Multi-signature Governance
- 3-of-5 multi-sig for critical operations
- Time-locked execution for governance changes
- Emergency pause functionality

### Anti-MEV Protection
- Same-block transaction prevention
- Nonce-based replay protection
- Transaction amount limits
- Wallet balance limits
- Cooldown periods

### Access Control
- Owner-controlled admin functions
- Fee exemption management
- Emergency controls
- Governance-controlled parameters

## 📊 Economics

### Fee Distribution
- **Treasury**: 50% of fees (0.5% of transfers)
- **Founder**: 20% of fees (0.2% of transfers)
- **Burn**: 30% of fees (0.3% of transfers)

### Staking Rewards
- Rewards come from a dedicated reward pool
- APY rates are fixed but can be changed through governance
- Early withdrawal penalty: 10% of staked amount
- Auto-compound option for exponential growth

### Governance Economics
- **Proposal Bond**: 1M FIA (refundable if passed)
- **Voting Power**: 1 FIA = 1 vote
- **Quorum**: 10% of total supply
- **Execution Delay**: 48 hours for security

## 🔄 Migration from V4

FIACoinV5 is designed as a new contract deployment rather than an upgrade. Key differences:

### What's New in V5
- ✅ **Increased Supply**: 1B → 1000T tokens
- ✅ **Governance System**: Community-controlled parameters
- ✅ **Staking Rewards**: Yield generation for token holders
- ✅ **Batch Operations**: Gas-efficient multiple operations
- ✅ **Anti-MEV Protection**: Advanced security measures
- ✅ **Analytics**: Comprehensive on-chain tracking

### What's Preserved from V4
- ✅ **Fee-on-Transfer**: Same fee mechanism
- ✅ **Burn Functionality**: Token burning capabilities
- ✅ **Pause Mechanism**: Emergency controls
- ✅ **Owner Controls**: Admin functions
- ✅ **Event Structure**: Compatible event emissions

## 🛣️ Development Roadmap

### Phase 1: Core Features ✅
- [x] Governance system implementation
- [x] Staking mechanism with variable APY
- [x] Batch operations
- [x] Anti-MEV protection

### Phase 2: Advanced Features 🚧
- [ ] DeFi protocol integrations
- [ ] Cross-chain bridge implementation
- [ ] Advanced analytics dashboard
- [ ] Yield farming strategies

### Phase 3: Ecosystem Growth 📋
- [ ] Partner integrations
- [ ] Liquidity mining programs
- [ ] Community governance transition
- [ ] Multi-chain deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **GitHub**: [FIACoin Repository](https://github.com/davidepatrucco/fing)
- **Documentation**: See `/specs/SPECS_V5.md` for detailed specifications
- **Audit**: Professional security audit required before mainnet deployment

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Always verify contract addresses and perform due diligence before interacting with smart contracts.