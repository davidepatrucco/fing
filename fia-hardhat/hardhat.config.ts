import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";

const ALCHEMY = process.env.RPC_BASE_SEPOLIA || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.8.22",
        settings: { optimizer: { enabled: true, runs: 200 } },
      }
    ]
  },
  networks: {
    baseSepolia: {
      url: ALCHEMY,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // For Base Sepolia verification: provide the API key in .env as BASESCAN_API_KEY or ETHERSCAN_API_KEY
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          // Common explorer API pattern for Base Sepolia (may require verification)
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org'
        }
      }
    ]
  }
};

export default config;
