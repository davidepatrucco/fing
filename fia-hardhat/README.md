# FIA Hardhat — Quick Start

Development quick-start for the `fia-hardhat` workspace.

Prerequisites
- Node.js 18+ and npm
- Git

Setup (local)

```bash
# Link local environment file
./setup-env.sh local

# Install dependencies
npm ci

# Compile
npm run compile

# Run V6 tests
npm run test

# Run coverage (may be slow)
npm run coverage
```

Notes
- Use `.env.example` as a template for `.env.local`, `.env.staging`, `.env.production`.
- CI workflow runs compile + tests on push/PR.
# FIA Hardhat (scaffold)

Scaffolded Hardhat project tailored to the `FIA` guide (`FIA_BaseSepolia_Launch_Guide.md`).

Files:
- `contracts/` - place provided Solidity contracts here.
- `scripts/` - helper deploy/airdrop/leaderboard/watch scripts.

Usage:
1. Copy `.env.example` to `.env` and fill.
2. npm install
3. npx hardhat compile
4. npm run deploy
