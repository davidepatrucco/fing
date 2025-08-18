# FIA (Finger In Ass) Token Project - Complete Instructions

## Table of Contents

1. [Project Overview](#project-overview)
2. [Purpose and Concept](#purpose-and-concept)
3. [Architecture Overview](#architecture-overview)
4. [Code Organization](#code-organization)
5. [Smart Contracts](#smart-contracts)
6. [Web Application](#web-application)
7. [Development Setup](#development-setup)
8. [Deployment Guide](#deployment-guide)
9. [Usage Examples](#usage-examples)
10. [API Reference](#api-reference)
11. [Testing Strategy](#testing-strategy)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)
13. [Security Considerations](#security-considerations)
14. [Contributing](#contributing)
15. [Troubleshooting](#troubleshooting)

---

## Project Overview

FIA (Finger In Ass) is a humorous meme token project built on the Base blockchain (initially deployed on Base Sepolia testnet) that combines traditional ERC20 token functionality with interactive community features. The project creates an engaging ecosystem where token transfers trigger "Fingered" events, building a community-driven leaderboard and gamification layer around token interactions.

### Key Features

- **ERC20 Token with Fee Mechanics**: Implements a sophisticated fee system with treasury, founder, and burn allocations
- **Event-Driven Leaderboard**: Tracks and ranks top "fingerers" and "receivers" based on transaction events
- **Real-time Monitoring**: Live event streaming and transaction monitoring
- **Airdrop Tools**: Admin tools for batch token distribution
- **LP Timelock**: Liquidity pool locking mechanisms for security
- **Web Interface**: Complete web application for community interaction
- **Developer Tools**: Comprehensive deployment and monitoring scripts

---

## Purpose and Concept

### The Meme Economy
FIA represents the evolution of meme tokens beyond simple speculation. It creates genuine utility through:

1. **Gamification**: Every transfer becomes a competitive act tracked on public leaderboards
2. **Community Building**: Shared humor and interactive features foster engagement
3. **Proof of Concept**: Demonstrates advanced tokenomics and event-driven mechanics
4. **Educational Value**: Serves as a comprehensive example of modern DeFi infrastructure

### Core Mechanics

**The "Fingering" System:**
- Every token transfer emits a `Fingered` event
- Events track `from`, `to`, and `amount` parameters
- Leaderboard aggregates these events to show:
  - Top fingerers (most active senders)
  - Top receivers (most popular recipients)
  - Total volume and interaction statistics

**Fee Structure:**
- 1% total fee on transfers (configurable)
- 0.5% to treasury wallet
- 0.2% to founder wallet  
- 0.3% burned permanently
- Exemptions for treasury, founder, and designated addresses

---

## Architecture Overview

The FIA project follows a modular architecture with clear separation of concerns:

```
FIA Project Architecture
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Smart         │    │   Web           │    │   Event         │
│   Contracts     │◄──►│   Application   │◄──►│   Indexer       │
│   (Blockchain)  │    │   (Frontend)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐              ┌───▼────┐              ┌───▼────┐
    │ Base    │              │ Next.js│              │ SQLite │
    │ Sepolia │              │ Vercel │              │   DB   │
    └─────────┘              └────────┘              └────────┘
```

### Layer Breakdown

1. **Blockchain Layer**: Smart contracts deployed on Base Sepolia
2. **Application Layer**: Next.js web application with React components
3. **Data Layer**: Event indexing and database storage
4. **API Layer**: RESTful endpoints for data access
5. **Infrastructure Layer**: Deployment and monitoring tools

---

## Code Organization

The project is organized into four main directories:

### `/fia-hardhat/` - Smart Contract Development
```
fia-hardhat/
├── contracts/              # Solidity smart contracts
│   ├── FIACoin.sol         # Main ERC20 token contract
│   ├── LPTimelock.sol      # Liquidity pool timelock
│   └── NFTTimelock.sol     # NFT timelock mechanism
├── scripts/                # Deployment and utility scripts
│   ├── deploy.ts           # Contract deployment
│   ├── airdrop.ts          # Batch token distribution
│   ├── leaderboard.ts      # Event aggregation
│   ├── verify.ts           # Contract verification
│   └── watch-events.ts     # Real-time event monitoring
├── test/                   # Contract tests
├── hardhat.config.ts       # Hardhat configuration
├── package.json            # Dependencies and scripts
└── .env.example            # Environment variables template
```

### `/web/` - Web Application
```
web/
├── app/                    # Next.js 15 app directory
│   ├── page.tsx            # Home page
│   ├── token/page.tsx      # Token information
│   ├── leaderboard/page.tsx# Community rankings
│   ├── monitor/page.tsx    # Event monitoring
│   ├── tools/page.tsx      # Developer tools
│   ├── docs/page.tsx       # Documentation
│   └── api/                # API routes
│       ├── contract/       # Contract information
│       ├── leaderboard/    # Leaderboard data
│       ├── events/         # Event streaming
│       └── airdrop/        # Airdrop execution
├── components/             # Reusable React components
├── lib/                    # Utility functions
├── scripts/                # Backend scripts
│   └── indexer.js          # Event indexing service
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
└── .env.example            # Environment variables template
```

### `/specs/` - Documentation and Specifications
```
specs/
├── website.md                      # Detailed website specifications
├── FIA_BaseSepolia_Launch_Guide.md # Step-by-step launch guide
└── fff.txt                         # Additional notes
```

### Root Level Configuration
```
├── .github/                # GitHub Actions workflows
├── instructions.md         # This comprehensive guide
└── README.md              # Project overview (if present)
```

---

## Smart Contracts

### FIACoin.sol - Main Token Contract

The core ERC20 token implementing the FIA mechanics:

**Key Features:**
- **Total Supply**: 1 billion tokens minted at deployment
- **Fee System**: Configurable percentage fees on transfers
- **Burn Mechanism**: Tokens can be permanently removed from circulation
- **Event Emission**: All transfers emit `Fingered` events for tracking
- **Access Control**: Owner-based permissions for fee configuration

**Contract Architecture:**
```solidity
contract FIACoin is ERC20, Ownable {
    // Fee configuration (basis points)
    uint256 public constant MAX_TOTAL_FEE_BP = 200;  // 2% maximum
    uint256 public totalFeeBP = 100;                 // 1% default
    uint256 public feeToTreasuryBP = 50;            // 0.5%
    uint256 public feeToFounderBP = 20;             // 0.2%
    uint256 public feeToBurnBP = 30;                // 0.3%
    
    // Addresses
    address public treasury;
    address public founderWallet;
    
    // Fee exemptions
    mapping(address => bool) public isFeeExempt;
    
    // Events
    event Fingered(address indexed from, address indexed to, uint256 amount);
}
```

**Fee Distribution Logic:**
1. Calculate total fee from transfer amount
2. Distribute proportionally to treasury, founder, and burn
3. Send remaining amount to recipient
4. Emit `Fingered` event for tracking

### LPTimelock.sol - Liquidity Pool Security

Implements timelock functionality for liquidity pool tokens:

**Purpose:**
- Prevents rug pulls by locking LP tokens
- Provides transparency through on-chain verification
- Builds community trust through provable lock periods

**Key Methods:**
- `lock(uint256 unlockTime)`: Lock LP tokens until specified time
- `unlock()`: Release tokens after lock period expires
- `extendLock(uint256 newUnlockTime)`: Extend existing lock

### NFTTimelock.sol - NFT Badge System

Optional NFT functionality for community rewards:

**Features:**
- Mint "Butt Badges" for top performers
- Timelock NFT transfers for commitment
- Integration with leaderboard achievements

---

## Web Application

### Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS for responsive design
- **Blockchain Integration**: ethers.js v6 for Web3 interactions
- **Database**: SQLite for development, PostgreSQL for production
- **Deployment**: Vercel-ready configuration
- **Real-time Features**: Server-Sent Events (SSE) for live updates

### Key Pages and Components

#### Home Page (`/`)
**Purpose**: Project introduction and navigation hub
**Features**:
- Hero section with project branding
- Quick statistics display
- Call-to-action buttons
- Recent events preview
- Social media links

#### Token Page (`/token`)
**Purpose**: Comprehensive token information
**Features**:
- Contract address and verification status
- Tokenomics breakdown with visual charts
- MetaMask integration for token import
- Real-time supply and holder statistics
- Fee structure explanation

#### Leaderboard Page (`/leaderboard`)
**Purpose**: Community rankings and competition
**Features**:
- Top fingerers and receivers tables
- Filtering by date range and block numbers
- CSV export functionality
- Pagination for large datasets
- Real-time updates

**Data Processing:**
```typescript
// Leaderboard aggregation logic
interface LeaderboardEntry {
  address: string;
  totalSent: bigint;
  totalReceived: bigint;
  transactionCount: number;
  rank: number;
}

// API endpoint processes events to generate rankings
const aggregateEvents = (events: FingeredEvent[]) => {
  const entries = new Map<string, LeaderboardEntry>();
  
  events.forEach(event => {
    // Update sender statistics
    updateEntry(entries, event.from, 'sent', event.amount);
    // Update receiver statistics  
    updateEntry(entries, event.to, 'received', event.amount);
  });
  
  return Array.from(entries.values()).sort((a, b) => 
    Number(b.totalSent - a.totalSent)
  );
};
```

#### Monitor Page (`/monitor`)
**Purpose**: Real-time event tracking
**Features**:
- Live event feed with auto-refresh
- Transaction details and BaseScan links
- Event filtering and search
- Historical event browsing
- Performance metrics

#### Tools Page (`/tools`)
**Purpose**: Developer and admin utilities
**Features**:
- Airdrop tool with CSV upload
- Contract deployment guides
- Gas estimation tools
- Batch transaction utilities
- Developer documentation links

#### Docs Page (`/docs`)
**Purpose**: Comprehensive documentation
**Features**:
- Setup instructions for developers
- API reference documentation
- Code examples and snippets
- Integration guides
- Troubleshooting resources

### Event Indexing System

The application includes a sophisticated event indexing system for efficient data access:

**Indexer Architecture:**
```javascript
// scripts/indexer.js
class EventIndexer {
  constructor(provider, contractAddress, database) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
    this.db = database;
  }
  
  async indexEvents(fromBlock = 0, toBlock = 'latest') {
    const events = await this.contract.queryFilter('Fingered', fromBlock, toBlock);
    
    for (const event of events) {
      await this.storeEvent({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        from: event.args.from,
        to: event.args.to,
        amount: event.args.amount.toString(),
        timestamp: await this.getBlockTimestamp(event.blockNumber)
      });
    }
  }
  
  async watchEvents() {
    this.contract.on('Fingered', async (from, to, amount, event) => {
      await this.storeEvent({...event.args, ...event});
      this.notifySubscribers(event);
    });
  }
}
```

**Database Schema:**
```sql
-- Events table
CREATE TABLE fingered_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_from_address ON fingered_events(from_address);
CREATE INDEX idx_to_address ON fingered_events(to_address);
CREATE INDEX idx_block_number ON fingered_events(block_number);
CREATE INDEX idx_timestamp ON fingered_events(timestamp);
```

---

## Development Setup

### Prerequisites

Before starting development, ensure you have:

- **Node.js 20+**: Download from [nodejs.org](https://nodejs.org)
- **Git**: For version control
- **MetaMask**: Browser extension for Web3 interactions
- **Base Sepolia ETH**: For testing (obtain from faucets)
- **Code Editor**: VS Code recommended with Solidity extensions

### Environment Setup

1. **Clone the Repository**
```bash
git clone https://github.com/davidepatrucco/fing.git
cd fing
```

2. **Setup Smart Contract Development**
```bash
cd fia-hardhat
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values:
# - PRIVATE_KEY: Your wallet private key (testnet only!)
# - RPC_BASE_SEPOLIA: Base Sepolia RPC endpoint
# - BASESCAN_API_KEY: For contract verification
```

3. **Setup Web Application**
```bash
cd ../web
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values:
# - NEXT_PUBLIC_FIA_CONTRACT_ADDRESS: Deployed contract address
# - RPC_BASE_SEPOLIA: Same as hardhat config
# - DATABASE_URL: SQLite database path
```

### Base Sepolia Network Configuration

Add Base Sepolia to MetaMask:

```json
{
  "chainId": "0x14a34",
  "chainName": "Base Sepolia",
  "rpcUrls": ["https://sepolia.base.org"],
  "nativeCurrency": {
    "name": "Sepolia Ether",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": ["https://sepolia.basescan.org"]
}
```

### Obtaining Test ETH

1. **Bridge ETH to Base Sepolia**: Use [Base Bridge](https://bridge.base.org/deposit)
2. **Sepolia Faucets**: 
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Faucet](https://sepoliafaucet.com/)
3. **Alternative**: Use Ethereum testnets and bridge

### Development Workflow

1. **Start with Smart Contracts**
```bash
cd fia-hardhat

# Compile contracts
npm run compile

# Run tests (if available)
npm test

# Deploy to local network
npx hardhat node  # In separate terminal
npm run deploy:local
```

2. **Deploy to Base Sepolia**
```bash
# Ensure .env is configured with funded wallet
npm run deploy

# Verify contract
npm run verify -- <CONTRACT_ADDRESS> "<TREASURY_ADDRESS>" "<FOUNDER_ADDRESS>"
```

3. **Start Web Application**
```bash
cd ../web

# Start development server
npm run dev

# In separate terminal, start event indexer
npm run indexer:watch
```

4. **Access the Application**
- Web interface: http://localhost:3000
- Monitor real-time events and test functionality

---

## Deployment Guide

### Smart Contract Deployment

#### Local Development
```bash
cd fia-hardhat

# Start local Hardhat network
npx hardhat node

# Deploy contracts
npm run deploy:local

# Contract will be deployed and address printed
# Update web/.env with the contract address
```

#### Base Sepolia Testnet
```bash
# Ensure wallet has Base Sepolia ETH
# Configure .env with:
# - PRIVATE_KEY (funded wallet)
# - RPC_BASE_SEPOLIA
# - BASESCAN_API_KEY

# Deploy
npm run deploy

# Output example:
# Deployer: 0x1234...
# FIA deployed at: 0x5678...
# Saved deployment to deployments/fia.json

# Verify contract (recommended)
npm run verify -- 0x5678... "0xTREASURY" "0xFOUNDER"
```

#### Production Deployment (Base Mainnet)
```bash
# WARNING: Use secure key management for mainnet
# Update hardhat.config.ts for Base mainnet
# Ensure sufficient ETH for deployment gas

npm run deploy:mainnet  # Custom script needed
```

### Web Application Deployment

#### Vercel Deployment (Recommended)

1. **Connect Repository to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# From web/ directory
cd web
vercel

# Follow prompts to connect GitHub repository
```

2. **Configure Environment Variables in Vercel Dashboard**
```env
NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_BASE_SEPOLIA=https://sepolia.base.org
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
DATABASE_URL=./events.db
NEXT_PUBLIC_NETWORK=baseSepolia
NEXT_PUBLIC_CHAIN_ID=84532
ADMIN_TOKEN=secure-random-token
```

3. **Deploy**
```bash
vercel --prod
```

#### Self-Hosted Deployment

```bash
cd web

# Build application
npm run build

# Start production server
npm start

# Setup process manager (PM2 recommended)
npm install -g pm2
pm2 start npm --name "fia-web" -- start
pm2 startup
pm2 save
```

### Database Setup

#### Development (SQLite)
```bash
# Database is automatically created
# Location: web/events.db
# No additional setup required
```

#### Production (PostgreSQL)
```bash
# Install PostgreSQL
# Create database and user
createdb fia_production
createuser fia_user

# Update DATABASE_URL in production environment
# DATABASE_URL=postgresql://fia_user:password@localhost/fia_production

# Database schema is created automatically by indexer
```

### CI/CD Pipeline

GitHub Actions workflow example:

```yaml
# .github/workflows/deploy.yml
name: Deploy FIA Application

on:
  push:
    branches: [main]

jobs:
  deploy-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd fia-hardhat
          npm install
      
      - name: Compile contracts
        run: |
          cd fia-hardhat
          npm run compile
      
      - name: Deploy contracts
        env:
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          RPC_BASE_SEPOLIA: ${{ secrets.RPC_BASE_SEPOLIA }}
        run: |
          cd fia-hardhat
          npm run deploy
      
      - name: Verify contracts
        env:
          BASESCAN_API_KEY: ${{ secrets.BASESCAN_API_KEY }}
        run: |
          cd fia-hardhat
          npm run verify

  deploy-web:
    needs: deploy-contracts
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./web
```

---

## Usage Examples

### Basic Token Operations

#### Transfer Tokens (Triggering Fingered Event)
```javascript
import { ethers } from 'ethers';

// Connect to Base Sepolia
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(privateKey, provider);

// Contract instance
const contract = new ethers.Contract(contractAddress, abi, signer);

// Transfer tokens (will emit Fingered event)
const tx = await contract.transfer(
  '0xRecipientAddress',
  ethers.parseUnits('100', 18)  // 100 FIA tokens
);

await tx.wait();
console.log('Transfer completed:', tx.hash);
```

#### Burn Tokens
```javascript
// Burn tokens permanently
const burnTx = await contract.burn(ethers.parseUnits('50', 18));
await burnTx.wait();
console.log('Burned 50 FIA tokens');
```

#### Check Fee Exemption Status
```javascript
const isExempt = await contract.isFeeExempt('0xAddress');
console.log('Fee exempt:', isExempt);
```

### Leaderboard Queries

#### Fetch Top Fingerers
```javascript
// API call to get leaderboard data
const response = await fetch('/api/leaderboard?type=fingerers&limit=10');
const leaderboard = await response.json();

leaderboard.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.address}: ${entry.totalSent} FIA sent`);
});
```

#### Export Leaderboard to CSV
```javascript
const exportResponse = await fetch('/api/leaderboard/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromBlock: 0,
    toBlock: 'latest',
    type: 'fingerers'
  })
});

const csvData = await exportResponse.text();
// Download or save CSV data
```

### Event Monitoring

#### Listen for Real-time Events
```javascript
// WebSocket connection for live events
const eventSource = new EventSource('/api/events/stream');

eventSource.onmessage = (event) => {
  const fingerEvent = JSON.parse(event.data);
  console.log(`New finger: ${fingerEvent.from} → ${fingerEvent.to} (${fingerEvent.amount} FIA)`);
  
  // Update UI with new event
  updateEventFeed(fingerEvent);
};
```

#### Query Historical Events
```javascript
// Fetch events from specific block range
const eventsResponse = await fetch(
  `/api/events?fromBlock=1000000&toBlock=1001000&limit=100`
);
const events = await eventsResponse.json();

events.forEach(event => {
  console.log(`Block ${event.blockNumber}: ${event.from} fingered ${event.to}`);
});
```

### Airdrop Operations (Admin Only)

#### Upload and Validate Airdrop List
```javascript
// Prepare airdrop data
const airdropData = [
  { address: '0x1234...', amount: '100' },
  { address: '0x5678...', amount: '50' },
  // ... more recipients
];

// Validate addresses
const validation = await fetch('/api/airdrop/validate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({ recipients: airdropData })
});

const validationResult = await validation.json();
console.log('Validation result:', validationResult);
```

#### Execute Airdrop
```javascript
// Execute airdrop (requires admin authentication)
const airdropExecution = await fetch('/api/airdrop/execute', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    recipients: airdropData,
    batchSize: 50  // Process 50 recipients per transaction
  })
});

const result = await airdropExecution.json();
console.log('Airdrop transactions:', result.transactions);
```

### Contract Information

#### Get Contract Details
```javascript
const contractInfo = await fetch('/api/contract');
const info = await contractInfo.json();

console.log('Contract Address:', info.address);
console.log('Verified:', info.verified);
console.log('Total Supply:', info.totalSupply);
```

#### Check Network Status
```javascript
const networkStatus = await fetch('/api/network/status');
const status = await networkStatus.json();

console.log('Current Block:', status.blockNumber);
console.log('Network ID:', status.chainId);
console.log('Gas Price:', status.gasPrice);
```

---

## API Reference

### Core Endpoints

#### GET /api/contract
Returns contract information and status.

**Response:**
```json
{
  "address": "0x...",
  "network": "baseSepolia",
  "verified": true,
  "name": "Finger In Ass",
  "symbol": "FIA",
  "decimals": 18,
  "totalSupply": "1000000000000000000000000000",
  "treasury": "0x...",
  "founder": "0x..."
}
```

#### GET /api/leaderboard
Retrieves leaderboard data with optional filtering.

**Parameters:**
- `type`: 'fingerers' | 'receivers' (default: 'fingerers')
- `limit`: number (default: 50, max: 1000)
- `offset`: number (default: 0)
- `fromBlock`: number (optional)
- `toBlock`: number | 'latest' (optional)

**Response:**
```json
{
  "data": [
    {
      "address": "0x...",
      "totalSent": "1000000000000000000000",
      "totalReceived": "500000000000000000000",
      "transactionCount": 25,
      "rank": 1
    }
  ],
  "pagination": {
    "total": 1337,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/events
Retrieves historical Fingered events.

**Parameters:**
- `fromBlock`: number (optional)
- `toBlock`: number | 'latest' (optional)
- `limit`: number (default: 100, max: 1000)
- `offset`: number (default: 0)
- `address`: string (optional, filter by participant)

**Response:**
```json
{
  "events": [
    {
      "id": 123,
      "blockNumber": 1000001,
      "transactionHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "amount": "1000000000000000000",
      "timestamp": 1703123456,
      "basescanUrl": "https://sepolia.basescan.org/tx/0x..."
    }
  ],
  "pagination": {
    "total": 5000,
    "hasMore": true
  }
}
```

#### GET /api/events/stream (Server-Sent Events)
Real-time event streaming endpoint.

**Usage:**
```javascript
const eventSource = new EventSource('/api/events/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle new event
};
```

### Admin Endpoints

#### POST /api/airdrop/validate
Validates airdrop recipient list (requires authentication).

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipients": [
    { "address": "0x...", "amount": "100" }
  ]
}
```

**Response:**
```json
{
  "valid": true,
  "totalRecipients": 100,
  "totalAmount": "10000",
  "invalidAddresses": [],
  "duplicateAddresses": [],
  "estimatedGas": "2100000",
  "estimatedBatches": 2
}
```

#### POST /api/airdrop/execute
Executes airdrop distribution (requires authentication).

**Request Body:**
```json
{
  "recipients": [
    { "address": "0x...", "amount": "100" }
  ],
  "batchSize": 50
}
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "batchId": 1,
      "transactionHash": "0x...",
      "recipients": 50,
      "totalAmount": "5000",
      "gasUsed": "1050000"
    }
  ],
  "summary": {
    "totalBatches": 2,
    "totalRecipients": 100,
    "totalAmount": "10000",
    "totalGasUsed": "2100000"
  }
}
```

### Utility Endpoints

#### GET /api/network/status
Returns current network status and metrics.

**Response:**
```json
{
  "chainId": 84532,
  "blockNumber": 1000500,
  "gasPrice": "1000000000",
  "isHealthy": true,
  "lastUpdate": 1703123456
}
```

#### GET /api/stats
Returns application statistics and metrics.

**Response:**
```json
{
  "totalEvents": 5000,
  "totalParticipants": 1337,
  "totalVolume": "50000000000000000000000",
  "avgTransactionSize": "10000000000000000000",
  "topFingerAmount": "1000000000000000000000",
  "lastEventTimestamp": 1703123456
}
```

---

## Testing Strategy

### Smart Contract Testing

#### Unit Tests
```typescript
// test/FIACoin.test.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('FIACoin', function () {
  it('Should deploy with correct initial supply', async function () {
    const [owner, treasury, founder] = await ethers.getSigners();
    
    const FIA = await ethers.getContractFactory('FIACoin');
    const fia = await FIA.deploy(treasury.address, founder.address);
    
    const supply = await fia.totalSupply();
    expect(supply).to.equal(ethers.parseUnits('1000000000', 18));
  });
  
  it('Should emit Fingered event on transfer', async function () {
    // Test implementation
  });
  
  it('Should apply fees correctly', async function () {
    // Test fee calculation and distribution
  });
});
```

#### Integration Tests
```typescript
// test/integration/Airdrop.test.ts
describe('Airdrop Integration', function () {
  it('Should execute batch airdrop correctly', async function () {
    // Deploy contract
    // Prepare recipient list
    // Execute airdrop script
    // Verify balances and events
  });
});
```

### Web Application Testing

#### Component Tests
```typescript
// components/__tests__/Leaderboard.test.tsx
import { render, screen } from '@testing-library/react';
import Leaderboard from '../Leaderboard';

describe('Leaderboard Component', () => {
  it('renders leaderboard data correctly', () => {
    const mockData = [
      { address: '0x123', totalSent: '1000', rank: 1 }
    ];
    
    render(<Leaderboard data={mockData} />);
    expect(screen.getByText('0x123')).toBeInTheDocument();
  });
});
```

#### API Tests
```typescript
// __tests__/api/leaderboard.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/leaderboard';

describe('/api/leaderboard', () => {
  it('returns leaderboard data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { limit: '10' }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('data');
  });
});
```

#### End-to-End Tests
```typescript
// e2e/leaderboard.spec.ts
import { test, expect } from '@playwright/test';

test('leaderboard page displays correctly', async ({ page }) => {
  await page.goto('/leaderboard');
  
  await expect(page.locator('h1')).toContainText('Leaderboard');
  await expect(page.locator('[data-testid="leaderboard-table"]')).toBeVisible();
  
  // Test CSV export
  await page.click('[data-testid="export-csv"]');
  // Verify download
});
```

### Performance Testing

#### Load Testing with k6
```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let response = http.get('http://localhost:3000/api/leaderboard');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd fia-hardhat
          npm install
      
      - name: Run contract tests
        run: |
          cd fia-hardhat
          npm test
      
      - name: Run coverage
        run: |
          cd fia-hardhat
          npm run coverage

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd web
          npm install
      
      - name: Run unit tests
        run: |
          cd web
          npm test
      
      - name: Run E2E tests
        run: |
          cd web
          npm run test:e2e
```

---

## Monitoring and Maintenance

### Application Monitoring

#### Health Checks
```typescript
// pages/api/health.ts
export default async function handler(req, res) {
  try {
    // Check database connection
    await database.query('SELECT 1');
    
    // Check RPC connection
    const provider = new ethers.JsonRpcProvider(process.env.RPC_BASE_SEPOLIA);
    await provider.getBlockNumber();
    
    // Check contract accessibility
    const contract = new ethers.Contract(contractAddress, abi, provider);
    await contract.totalSupply();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: Date.now(),
      services: {
        database: 'operational',
        rpc: 'operational',
        contract: 'operational'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

#### Performance Metrics
```typescript
// lib/monitoring.ts
import { EventEmitter } from 'events';

class MetricsCollector extends EventEmitter {
  private metrics = new Map();
  
  recordResponseTime(endpoint: string, duration: number) {
    const key = `response_time.${endpoint}`;
    this.updateMetric(key, duration);
  }
  
  recordEventProcessed() {
    this.incrementMetric('events.processed');
  }
  
  recordError(type: string) {
    this.incrementMetric(`errors.${type}`);
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

export const metrics = new MetricsCollector();
```

### Error Handling and Logging

#### Structured Logging
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
```

#### Error Boundary Component
```typescript
// components/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to monitoring service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details>
            {this.state.error?.message}
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Database Maintenance

#### Automatic Cleanup
```typescript
// scripts/cleanup.ts
async function cleanupOldEvents() {
  const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const result = await database.query(`
    DELETE FROM fingered_events 
    WHERE timestamp < ? 
    AND created_at < datetime('now', '-30 days')
  `, [oneMonthAgo]);
  
  console.log(`Cleaned up ${result.changes} old events`);
}

// Run cleanup weekly
setInterval(cleanupOldEvents, 7 * 24 * 60 * 60 * 1000);
```

#### Database Optimization
```sql
-- Regular maintenance queries
VACUUM; -- Rebuild database file
ANALYZE; -- Update query planner statistics

-- Create additional indexes if needed
CREATE INDEX IF NOT EXISTS idx_events_timestamp_desc 
ON fingered_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_amount 
ON fingered_events(amount);
```

### Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_FILE="./events.db"

# Create backup
sqlite3 $DB_FILE ".backup ${BACKUP_DIR}/events_${DATE}.db"

# Compress backup
gzip "${BACKUP_DIR}/events_${DATE}.db"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "events_*.db.gz" -mtime +30 -delete

echo "Backup completed: events_${DATE}.db.gz"
```

#### Configuration Backups
```bash
# Backup environment configurations
tar -czf "config_backup_$(date +%Y%m%d).tar.gz" \
  .env \
  hardhat.config.ts \
  next.config.ts \
  vercel.json
```

---

## Security Considerations

### Smart Contract Security

#### Access Control
The FIA contracts implement several security measures:

- **Ownership Pattern**: Uses OpenZeppelin's `Ownable` for administrative functions
- **Fee Limits**: Maximum fee capped at 2% to prevent excessive taxation
- **Address Validation**: Zero address checks prevent common mistakes
- **Reentrancy Protection**: Standard ERC20 implementation prevents reentrancy attacks

#### Security Best Practices
```solidity
// Example security patterns used in FIACoin.sol

contract FIACoin is ERC20, Ownable {
    // State variables
    uint256 public constant MAX_TOTAL_FEE_BP = 200; // Immutable limit
    
    // Input validation
    modifier validAddress(address addr) {
        require(addr != address(0), "zero address");
        _;
    }
    
    // Fee bounds checking
    function setFees(uint256 _totalFeeBP) external onlyOwner {
        require(_totalFeeBP <= MAX_TOTAL_FEE_BP, "fee too high");
        totalFeeBP = _totalFeeBP;
    }
}
```

### Web Application Security

#### Environment Variables Protection
```typescript
// lib/config.ts - Server-side only
const serverConfig = {
  privateKey: process.env.PRIVATE_KEY, // Never expose to client
  adminToken: process.env.ADMIN_TOKEN,
  databaseUrl: process.env.DATABASE_URL
};

const clientConfig = {
  contractAddress: process.env.NEXT_PUBLIC_FIA_CONTRACT_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA,
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID
};

// Only expose client config to frontend
export { clientConfig };
```

#### Input Validation
```typescript
// lib/validation.ts
import { ethers } from 'ethers';

export const validateAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

export const validateAmount = (amount: string): boolean => {
  try {
    const parsed = ethers.parseUnits(amount, 18);
    return parsed > 0n;
  } catch {
    return false;
  }
};

export const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase();
};
```

#### Rate Limiting
```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // More restrictive for admin endpoints
});
```

#### Authentication Middleware
```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';

export async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  return null; // Authentication successful
}
```

### Infrastructure Security

#### HTTPS and SSL
```javascript
// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force HTTPS in production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### Secrets Management
```bash
# Use environment-specific secret management

# Development
cp .env.example .env
# Edit .env with development values

# Production (Vercel)
vercel env add PRIVATE_KEY
vercel env add ADMIN_TOKEN
vercel env add BASESCAN_API_KEY

# Production (Self-hosted)
# Use Docker secrets, HashiCorp Vault, or similar
```

### Audit Checklist

Before production deployment:

- [ ] Smart contract audit by security firm
- [ ] Penetration testing of web application
- [ ] Code review of all critical functions
- [ ] Verification of environment variable security
- [ ] Testing of all admin functions with proper authentication
- [ ] Validation of input sanitization and rate limiting
- [ ] Review of third-party dependencies for vulnerabilities
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting systems configured
- [ ] Incident response plan documented

---

## Contributing

### Development Guidelines

#### Code Style
- **Solidity**: Follow OpenZeppelin standards
- **TypeScript**: Use strict mode and proper typing
- **React**: Functional components with hooks
- **CSS**: Tailwind utility classes, consistent naming

#### Git Workflow
```bash
# Feature development
git checkout -b feature/new-leaderboard-filter
# Make changes
git add .
git commit -m "Add date range filter to leaderboard"
git push origin feature/new-leaderboard-filter
# Create pull request
```

#### Pull Request Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Security considerations reviewed
```

### Issue Reporting

#### Bug Reports
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**Environment**
- OS: [e.g. macOS]
- Browser: [e.g. Chrome 120]
- Node.js: [e.g. 20.10.0]
- Network: [e.g. Base Sepolia]
```

#### Feature Requests
```markdown
**Feature Description**
Clear description of the requested feature.

**Use Case**
Explain why this feature would be useful.

**Proposed Implementation**
Suggest how this could be implemented.

**Additional Context**
Any other relevant information.
```

### Community Guidelines

#### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **Discord/Telegram**: Community discussion
- **Twitter**: Project updates and announcements

#### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers learn
- Focus on technical merit
- Maintain professionalism

---

## Troubleshooting

### Common Issues and Solutions

#### Smart Contract Deployment

**Issue: "insufficient funds for intrinsic transaction cost"**
```bash
# Solution: Ensure wallet has enough Base Sepolia ETH
# Check balance
cast balance --rpc-url https://sepolia.base.org 0xYourAddress

# Get testnet ETH from faucets or bridge
```

**Issue: "Contract verification failed"**
```bash
# Solution: Ensure correct constructor arguments
npm run verify -- 0xContractAddress "0xTreasuryAddress" "0xFounderAddress"

# Check that contract is fully synced on BaseScan
# Wait a few minutes after deployment before verifying
```

**Issue: "nonce too high" or "nonce too low"**
```bash
# Solution: Reset MetaMask account
# MetaMask → Settings → Advanced → Reset Account
# Or manually set nonce in transaction
```

#### Web Application

**Issue: "Cannot connect to database"**
```bash
# Check database file permissions
ls -la events.db

# Recreate database if corrupted
rm events.db
npm run indexer:index 0 latest
```

**Issue: "RPC calls failing"**
```bash
# Check RPC endpoint
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Try alternative RPC endpoints
# Update .env with working endpoint
```

**Issue: "Events not loading in leaderboard"**
```bash
# Check if indexer is running
npm run indexer:watch

# Manually index missing events
npm run indexer:index <fromBlock> <toBlock>

# Check database for events
sqlite3 events.db "SELECT COUNT(*) FROM fingered_events;"
```

#### Environment Configuration

**Issue: "Contract address not set"**
```bash
# Check environment variables
cat .env | grep CONTRACT_ADDRESS

# Ensure NEXT_PUBLIC_FIA_CONTRACT_ADDRESS is set
# Restart development server after changing .env
```

**Issue: "MetaMask not detecting network"**
```javascript
// Add Base Sepolia network to MetaMask
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x14a34',
    chainName: 'Base Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org']
  }]
});
```

### Performance Issues

#### Slow Leaderboard Loading
```sql
-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_events_composite 
ON fingered_events(from_address, to_address, amount);

-- Use LIMIT and OFFSET for pagination
SELECT * FROM fingered_events 
ORDER BY amount DESC 
LIMIT 50 OFFSET 0;
```

#### High Memory Usage
```javascript
// Implement data streaming for large datasets
async function* streamEvents(fromBlock, toBlock) {
  const batchSize = 1000;
  for (let i = fromBlock; i <= toBlock; i += batchSize) {
    const events = await contract.queryFilter('Fingered', i, Math.min(i + batchSize - 1, toBlock));
    yield events;
  }
}
```

### Debug Tools

#### Contract Interaction Scripts
```typescript
// scripts/debug-contract.ts
import { ethers } from 'hardhat';

async function debugContract() {
  const contract = await ethers.getContractAt('FIACoin', process.env.CONTRACT_ADDRESS);
  
  console.log('Contract Address:', contract.address);
  console.log('Total Supply:', await contract.totalSupply());
  console.log('Treasury:', await contract.treasury());
  console.log('Founder:', await contract.founderWallet());
  console.log('Total Fee BP:', await contract.totalFeeBP());
  
  // Test event filtering
  const events = await contract.queryFilter('Fingered', -1000, 'latest');
  console.log('Recent events:', events.length);
}

debugContract().catch(console.error);
```

#### Network Diagnostics
```bash
#!/bin/bash
# scripts/network-check.sh

echo "Checking Base Sepolia connectivity..."

# Check RPC endpoint
curl -s -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | jq '.result'

# Check BaseScan API
curl -s "https://api-sepolia.basescan.org/api?module=proxy&action=eth_blockNumber&apikey=$BASESCAN_API_KEY" \
  | jq '.result'

# Test contract call
cast call --rpc-url https://sepolia.base.org \
  $CONTRACT_ADDRESS \
  "totalSupply()(uint256)"
```

### Getting Help

#### Documentation Resources
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Base Network Documentation](https://docs.base.org/)

#### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join community discussions
- **Stack Overflow**: Technical questions with tags `solidity`, `nextjs`, `ethers`

#### Professional Support
For production deployments or complex issues:
- Smart contract audit services
- DevOps consultation
- Custom development services

---

## Conclusion

The FIA (Finger In Ass) project represents a comprehensive example of modern blockchain application development, combining smart contracts, web applications, and community features into a cohesive ecosystem. This documentation provides the foundation for understanding, developing, and maintaining the project.

### Key Takeaways

1. **Modular Architecture**: Clear separation between contracts, web app, and infrastructure
2. **Event-Driven Design**: Leverages blockchain events for rich user experiences
3. **Community Focus**: Gamification and leaderboards drive engagement
4. **Developer-Friendly**: Comprehensive tooling and documentation
5. **Security-Conscious**: Multiple layers of protection and best practices

### Next Steps

After following this guide, you should be able to:
- Deploy and manage FIA contracts on Base Sepolia
- Run the complete web application locally
- Understand the codebase organization and architecture
- Contribute new features and improvements
- Deploy to production environments

### Future Enhancements

Potential areas for expansion:
- NFT badge system implementation
- Advanced analytics and metrics
- Mobile application development
- Cross-chain deployment support
- Governance token integration
- DeFi protocol integrations

The FIA project serves as both a functional meme token and an educational resource for blockchain developers. Whether you're building similar projects or learning about DeFi development, this codebase provides practical examples of real-world implementation patterns.

Remember to always prioritize security, test thoroughly, and engage with the community when developing blockchain applications. The decentralized nature of these systems requires careful consideration of user trust, data integrity, and system reliability.

Happy fingering! 🚀