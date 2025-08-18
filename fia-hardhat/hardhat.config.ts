import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

const ALCHEMY = process.env.RPC_BASE_SEPOLIA || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    baseSepolia: {
      url: ALCHEMY,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // For Base Sepolia verification: set BASESCAN_API_KEY in .github/workflows or .env when ready
    apiKey: process.env.BASESCAN_API_KEY || ""
  }
};

export default config;
