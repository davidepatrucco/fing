# FIA Project - Comprehensive Instructions

**FIA (Finger In Ass) Token** - A humorous meme token project on Base Sepolia with advanced tokenomics and community features.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Smart Contract Development](#smart-contract-development)
6. [Web Application Development](#web-application-development)
7. [Deployment Guide](#deployment-guide)
8. [Testing & Verification](#testing--verification)
9. [Usage Examples](#usage-examples)
10. [API Reference](#api-reference)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)
13. [Security](#security)

## Project Overview

FIA is a meme token project featuring:

- **Smart Contracts**: ERC-20 token with advanced fee mechanics, burn functionality, and timelock contracts
- **Web Application**: React/Next.js frontend with real-time event monitoring, leaderboards, and developer tools
- **Developer Tools**: Hardhat scripts for deployment, airdrops, and contract verification
- **Community Features**: Leaderboard tracking, event monitoring, and CSV export functionality

### Key Features

- **Transaction Fees**: 2% total fees distributed to treasury (1%), founder (0.5%), and burned (0.5%)
- **Fee Exemptions**: Treasury, founder, and designated addresses are exempt from fees
- **Burnable Tokens**: Tokens can be permanently removed from circulation
- **Event Tracking**: All transfers emit "Fingered" events for community engagement
- **Real-time Monitoring**: Live event feed and leaderboard updates
- **Developer-Friendly**: Comprehensive tooling and documentation

## Repository Structure

```
fing/
├── fia-hardhat/              # Smart contract development
│   ├── contracts/            # Solidity contracts
│   │   ├── FIACoin.sol      # Main ERC-20 token contract
│   │   ├── LPTimelock.sol   # Liquidity pool timelock
│   │   └── NFTTimelock.sol  # NFT timelock contract
│   ├── scripts/             # Deployment and utility scripts
│   │   ├── deploy.ts        # Contract deployment
│   │   ├── airdrop.ts       # Token airdrop functionality
│   │   ├── leaderboard.ts   # Leaderboard data generation
│   │   └── watch-events.ts  # Event monitoring
│   ├── hardhat.config.ts    # Hardhat configuration
│   ├── .env.example         # Environment variables template
│   └── package.json         # Node.js dependencies
│
├── web/                     # Next.js web application
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx         # Home page
│   │   ├── token/           # Token information page
│   │   ├── leaderboard/     # Leaderboard functionality
│   │   ├── monitor/         # Real-time event monitoring
│   │   ├── tools/           # Developer tools
│   │   └── docs/            # Documentation pages
│   ├── scripts/             # Utility scripts
│   │   └── indexer.js       # Event indexing script
│   ├── .env.example         # Environment variables template
│   └── package.json         # Node.js dependencies
│
└── specs/                   # Technical specifications
    ├── FIA_BaseSepolia_Launch_Guide.md  # Detailed launch guide
    └── website.md                       # Website specifications
```

## Prerequisites

### System Requirements

- **Node.js 20+** (LTS recommended)
- **Git** for version control
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

### Development Tools

- **Code Editor**: VS Code, WebStorm, or similar
- **Terminal/Command Line** access
- **MetaMask** browser extension for blockchain interactions

### Blockchain Requirements

- **Base Sepolia Testnet** setup in MetaMask
- **Test ETH** for deployment and transactions
- **BaseScan API Key** (optional, for contract verification)

### Installation

1. **Install Node.js**:
   ```bash
   # Visit https://nodejs.org and download LTS version
   node -v  # Should show v20.x.x or higher
   npm -v   # Should show npm version
   ```

2. **Install Git**:
   ```bash
   git --version  # Verify installation
   ```

3. **Setup MetaMask**:
   - Install MetaMask browser extension
   - Create a new wallet or import existing
   - Add Base Sepolia network (see network configuration below)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/davidepatrucco/fing.git
cd fing
```

### 2. Setup Smart Contracts

```bash
cd fia-hardhat
cp .env.example .env
# Edit .env with your configuration (see environment setup below)
npm install
npm run compile
```

### 3. Setup Web Application

```bash
cd ../web
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

### 4. Access Application

- Web App: http://localhost:3000
- API Endpoints: http://localhost:3000/api/*

## Smart Contract Development

### Environment Setup

Create `fia-hardhat/.env` file:

```env
# Deployment Configuration
PRIVATE_KEY=your_private_key_here
TREASURY_ADDR=0x...  # Treasury wallet address
FOUNDER_ADDR=0x...   # Founder wallet address

# Network Configuration
RPC_BASE_SEPOLIA=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key

# Contract Addresses (set after deployment)
FIA_ADDR=0x...
```

### Available Scripts

```bash
# Compile contracts
npm run compile

# Deploy to Base Sepolia
npm run deploy

# Deploy locally (for testing)
npm run deploy:local

# Verify contract on BaseScan
npm run verify

# Run airdrop
npm run airdrop

# Generate leaderboard
npm run leaderboard

# Monitor events
npm run monitor

# Run tests
npm run test
```

### Contract Deployment

1. **Prepare Environment**:
   ```bash
   cd fia-hardhat
   cp .env.example .env
   # Configure your private key and network settings
   ```

2. **Compile Contracts**:
   ```bash
   npm run compile
   ```

3. **Deploy to Base Sepolia**:
   ```bash
   npm run deploy
   ```

4. **Verify Contract** (optional but recommended):
   ```bash
   # Set FIA_ADDR in .env to deployed contract address
   npm run verify
   ```

### Contract Architecture

#### FIACoin.sol
- **Type**: ERC-20 token with enhanced features
- **Features**: Fee mechanism, burn functionality, event emission
- **Fee Structure**: 2% total (1% treasury, 0.5% founder, 0.5% burn)
- **Events**: Emits `Fingered(from, to, amount)` on transfers

#### LPTimelock.sol
- **Purpose**: Locks liquidity pool tokens for specified duration
- **Use Case**: Ensures liquidity commitment and prevents rug pulls

#### NFTTimelock.sol
- **Purpose**: Locks NFT assets with time-based release
- **Use Case**: Vesting schedules and delayed asset distribution

## Web Application Development

### Environment Setup

Create `web/.env` file:

```env
# RPC Configuration
RPC_BASE_SEPOLIA=https://sepolia.base.org
NEXT_PUBLIC_RPC_BASE_SEPOLIA=https://sepolia.base.org

# Contract Configuration
NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...  # Set after deployment
NEXT_PUBLIC_NETWORK=baseSepolia
NEXT_PUBLIC_CHAIN_ID=84532

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=./events.db

# API Keys
BASESCAN_API_KEY=your_api_key

# Security
PRIVATE_KEY=your_private_key_here
ADMIN_TOKEN=your-admin-token-here
```

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Event indexing
npm run indexer
npm run indexer:watch
npm run indexer:index
```

### Application Features

#### Pages

1. **Home Page** (`/`):
   - Project overview and hero section
   - Quick stats and recent events
   - Navigation to key features

2. **Token Page** (`/token`):
   - Contract information and verification status
   - Tokenomics and supply details
   - MetaMask integration

3. **Leaderboard** (`/leaderboard`):
   - Top fingerers and receivers
   - Filtering and sorting options
   - CSV export functionality

4. **Monitor** (`/monitor`):
   - Real-time event feed
   - Transaction details
   - Auto-refresh functionality

5. **Tools** (`/tools`):
   - Developer utilities
   - Deployment guides
   - API documentation

6. **Docs** (`/docs`):
   - Comprehensive documentation
   - API reference
   - Code examples

#### API Endpoints

- `GET /api/contract` - Contract information
- `GET /api/events` - Fingering events with filtering
- `GET /api/leaderboard` - Aggregated leaderboard data

### Event Indexing

The application includes an event indexer to populate the database:

```bash
# Watch for new events (recommended for production)
npm run indexer:watch

# Index specific block range
npm run indexer:index 0 latest
```

## Deployment Guide

### Smart Contract Deployment

#### Base Sepolia Testnet

1. **Setup MetaMask**:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

2. **Get Test ETH**:
   ```bash
   # Visit Base Sepolia faucet
   # https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   ```

3. **Deploy Contract**:
   ```bash
   cd fia-hardhat
   npm run deploy
   ```

4. **Verify Contract**:
   ```bash
   # Update FIA_ADDR in .env with deployed address
   npm run verify
   ```

#### Base Mainnet

1. **Update Configuration**:
   ```bash
   # Edit hardhat.config.ts for mainnet
   # Update .env with mainnet RPC and real private key
   ```

2. **Deploy**:
   ```bash
   npm run deploy -- --network base
   ```

### Web Application Deployment

#### Vercel (Recommended)

1. **Setup Vercel Account**:
   - Connect GitHub repository
   - Import project from web/ directory

2. **Environment Variables**:
   Set in Vercel dashboard:
   ```
   RPC_BASE_SEPOLIA=https://sepolia.base.org
   NEXT_PUBLIC_RPC_BASE_SEPOLIA=https://sepolia.base.org
   NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_API_URL=https://your-app.vercel.app
   DATABASE_URL=./events.db
   BASESCAN_API_KEY=your_api_key
   ADMIN_TOKEN=your_admin_token
   ```

3. **Deploy**:
   - Push to main branch for automatic deployment
   - Or use Vercel CLI: `vercel --prod`

#### Manual Deployment

1. **Build Application**:
   ```bash
   cd web
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

#### Docker Deployment

```dockerfile
# Dockerfile for web application
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing & Verification

### Smart Contract Testing

```bash
cd fia-hardhat
npm run test
```

### Web Application Testing

```bash
cd web
npm run lint
npm run build  # Test build process
```

### Integration Testing

1. **Deploy Local Network**:
   ```bash
   cd fia-hardhat
   npx hardhat node  # In separate terminal
   npm run deploy:local
   ```

2. **Test Web App with Local Contract**:
   ```bash
   cd web
   # Update .env with local contract address
   npm run dev
   ```

### Contract Verification

#### Automatic Verification

```bash
cd fia-hardhat
npm run verify
```

#### Manual Verification (BaseScan)

1. Visit BaseScan contract page
2. Click "Verify and Publish"
3. Select "Solidity (Single file)"
4. Upload flattened contract source
5. Set compiler version and optimization settings
6. Add constructor arguments

### Security Auditing

1. **Static Analysis**:
   ```bash
   # Install and run Slither
   pip install slither-analyzer
   slither contracts/
   ```

2. **Manual Review**:
   - Check for reentrancy vulnerabilities
   - Verify access controls
   - Test edge cases

## Usage Examples

### Basic Token Operations

```javascript
// Connect to contract
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const contract = new ethers.Contract(contractAddress, abi, provider);

// Get token info
const name = await contract.name();
const symbol = await contract.symbol();
const totalSupply = await contract.totalSupply();

// Listen for events
contract.on('Fingered', (from, to, amount) => {
  console.log(`${from} fingered ${to} with ${amount} FIA`);
});
```

### API Usage

```bash
# Get contract information
curl "http://localhost:3000/api/contract"

# Get leaderboard
curl "http://localhost:3000/api/leaderboard?limit=10"

# Get events with filtering
curl "http://localhost:3000/api/events?limit=50&offset=0"
```

### Airdrop Execution

```bash
# Prepare CSV file with addresses and amounts
# address,amount
# 0x...,1000
# 0x...,500

cd fia-hardhat
npm run airdrop
```

### Leaderboard Generation

```bash
cd fia-hardhat
npm run leaderboard
```

## API Reference

### GET /api/contract

Returns contract information and verification status.

**Response:**
```json
{
  "address": "0x...",
  "name": "FIACoin",
  "symbol": "FIA",
  "totalSupply": "1000000000000000000000000",
  "verified": true,
  "network": "baseSepolia"
}
```

### GET /api/events

Returns filtered event data.

**Parameters:**
- `limit` (number): Number of events to return (default: 50)
- `offset` (number): Offset for pagination (default: 0)
- `from` (string): Filter by sender address
- `to` (string): Filter by receiver address

**Response:**
```json
{
  "events": [
    {
      "blockNumber": 123456,
      "transactionHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "amount": "1000000000000000000",
      "timestamp": 1234567890
    }
  ],
  "total": 1000
}
```

### GET /api/leaderboard

Returns aggregated leaderboard data.

**Parameters:**
- `limit` (number): Number of entries to return (default: 100)
- `type` (string): 'fingerers' or 'receivers'

**Response:**
```json
{
  "leaderboard": [
    {
      "address": "0x...",
      "totalAmount": "5000000000000000000",
      "transactionCount": 25,
      "rank": 1
    }
  ],
  "total": 500
}
```

## Troubleshooting

### Common Issues

#### 1. Compilation Errors

**Problem**: Hardhat compilation fails
```
Error HH502: Couldn't download compiler version list.
```

**Solution**:
```bash
# Check internet connection
# Try with specific compiler version
npx hardhat compile --force
```

#### 2. Deployment Failures

**Problem**: Transaction fails during deployment

**Solutions**:
- Check gas price and limits
- Verify account balance
- Ensure proper network configuration

#### 3. Web App Connection Issues

**Problem**: Cannot connect to contract

**Solutions**:
- Verify contract address in environment variables
- Check network configuration
- Ensure MetaMask is connected to correct network

#### 4. Event Indexing Issues

**Problem**: Events not appearing in database

**Solutions**:
```bash
# Reset database and re-index
rm events.db
npm run indexer:index 0 latest
```

### Debug Commands

```bash
# Check contract deployment
npx hardhat verify --network baseSepolia <contract-address>

# Test contract interaction
npx hardhat console --network baseSepolia

# Check event logs
npm run monitor

# Verify database state
sqlite3 events.db ".tables"
```

### Environment Issues

1. **Node.js Version**: Ensure Node.js 20+ is installed
2. **Dependencies**: Clear node_modules and reinstall if needed
3. **Environment Variables**: Double-check all required variables are set
4. **Network Access**: Verify internet connectivity for blockchain interactions

## Contributing

### Development Workflow

1. **Fork Repository**:
   ```bash
   git clone https://github.com/your-username/fing.git
   cd fing
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Changes**:
   ```bash
   # Test smart contracts
   cd fia-hardhat && npm test
   
   # Test web application
   cd web && npm run lint && npm run build
   ```

5. **Submit Pull Request**:
   - Provide clear description of changes
   - Include test results
   - Reference any related issues

### Code Style

- **TypeScript**: Use strict typing
- **ESLint**: Follow project linting rules
- **Prettier**: Use consistent formatting
- **Comments**: Document complex logic
- **Tests**: Write comprehensive test coverage

### Commit Guidelines

```bash
# Format: type(scope): description
git commit -m "feat(contracts): add burn functionality"
git commit -m "fix(web): resolve leaderboard filtering issue"
git commit -m "docs: update deployment instructions"
```

## Security

### Best Practices

1. **Private Keys**:
   - Never commit private keys to version control
   - Use environment variables for sensitive data
   - Rotate keys regularly

2. **Smart Contracts**:
   - Conduct thorough testing
   - Consider professional audits for mainnet
   - Implement proper access controls

3. **Web Application**:
   - Validate all user inputs
   - Implement rate limiting
   - Use HTTPS in production

### Responsible Disclosure

If you discover security vulnerabilities:

1. **Do NOT** open public issues
2. Email security concerns to the maintainers
3. Provide detailed reproduction steps
4. Allow time for remediation before disclosure

### Security Checklist

- [ ] Private keys secured and not committed
- [ ] Environment variables properly configured
- [ ] Contract access controls implemented
- [ ] Input validation on all user data
- [ ] Rate limiting on API endpoints
- [ ] HTTPS enabled in production
- [ ] Regular dependency updates
- [ ] Security audit completed (for mainnet)

---

## Additional Resources

- **Base Network**: https://base.org
- **Hardhat Documentation**: https://hardhat.org/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **ethers.js Documentation**: https://docs.ethers.org
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts

## Support

For questions and support:

- **GitHub Issues**: For bug reports and feature requests
- **Discord/Telegram**: Community discussions
- **Email**: Technical support and security issues

---

*Last updated: 2024*