# FIA Token Website

A comprehensive Next.js web application for the FIACoin ecosystem, supporting both legacy FIA v4 features and new FIACoinV5 advanced DeFi functionality.

## Features

### Core Features (v4 Compatible)
- **Home Page**: Token overview with hero section and feature highlights
- **Token Page**: Contract details, tokenomics, and MetaMask integration
- **Leaderboard**: Rankings of top fingerers and receivers with CSV export
- **Monitor**: Real-time event feed with auto-refresh
- **Tools**: Developer utilities and deployment guides
- **Docs**: Comprehensive documentation and API reference

### New FIACoinV5 Features 🆕
- **Governance**: Create and vote on proposals with token-weighted voting
- **Staking**: Stake tokens with variable lock periods and APY rewards
- **Protected Transfers**: Anti-MEV transfers with nonce protection
- **Multisig Treasury**: Multi-signature wallet management for treasury operations
- **Web3 Integration**: Full MetaMask wallet connection and transaction handling

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite for development (configurable for production)
- **Blockchain**: ethers.js v6 for Web3 interactions
- **Smart Contracts**: TypeChain for type-safe contract interactions
- **Deployment**: Vercel-ready configuration

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/davidepatrucco/fing.git
   cd fing/web
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # RPC Configuration
   NEXT_PUBLIC_RPC_URL=http://localhost:8545
   RPC_BASE_SEPOLIA=https://sepolia.base.org
   
   # Contract Addresses
   NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_FIA_V5_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS=0x...
   
   # Feature Flags
   NEXT_PUBLIC_ENABLE_DEV_TOOLS=false
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

### FIACoinV5 Local Development

For full V5 feature testing with local blockchain:

1. **Start Hardhat node**
   ```bash
   cd ../fia-hardhat
   npm install
   npx hardhat node
   ```

2. **Deploy V5 contracts** (in another terminal)
   ```bash
   npx hardhat run scripts/deploy-v5.ts --network hardhat
   ```

3. **Start frontend with local config**
   ```bash
   cd ../web
   NEXT_PUBLIC_RPC_URL=http://localhost:8545 \
   NEXT_PUBLIC_FIA_V5_CONTRACT_ADDRESS=<deployed_address> \
   npm run dev
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# RPC endpoint for Base Sepolia
RPC_BASE_SEPOLIA=https://sepolia.base.org
NEXT_PUBLIC_RPC_BASE_SEPOLIA=https://sepolia.base.org

# Contract address (set after deployment)
NEXT_PUBLIC_FIA_CONTRACT_ADDRESS=0x...

# BaseScan API key for contract verification
BASESCAN_API_KEY=your_api_key

# Private key for admin operations (server-side only)
PRIVATE_KEY=your_private_key

# API URL for frontend
NEXT_PUBLIC_API_URL=http://localhost:3000

# Database
DATABASE_URL=./events.db

# Network configuration
NEXT_PUBLIC_NETWORK=baseSepolia
NEXT_PUBLIC_CHAIN_ID=84532

# Admin authentication
ADMIN_TOKEN=your-admin-token-here
```

## Event Indexing

The application includes an event indexer to populate the database with Fingered events:

```bash
# Watch for new events (recommended for production)
npm run indexer:watch

# Index specific block range
npm run indexer:index 0 latest
```

## API Endpoints

- `GET /api/contract` - Contract information and verification status
- `GET /api/events` - Fingering events with optional filtering
- `GET /api/leaderboard` - Aggregated leaderboard data

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## Architecture

- **Frontend**: React components with TypeScript
- **API Layer**: Next.js API routes handling blockchain interactions
- **Database**: SQLite for events storage with aggregation queries
- **Blockchain**: ethers.js provider for Base Sepolia interactions
- **Real-time**: Polling-based event monitoring with auto-refresh

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security

- Private keys are never exposed to the frontend
- Admin endpoints require authentication
- Input validation on all user data
- Rate limiting on API endpoints

## License

MIT License - see LICENSE file for details.
