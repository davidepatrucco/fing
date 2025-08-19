const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  
  console.log("💰 Wallet:", signer.address);
  console.log("⚡ ETH Balance:", ethers.formatEther(balance), "ETH");
  console.log("🔢 Wei Balance:", balance.toString());
  
  // Stima quanto serve per le operazioni Uniswap
  const estimatedGasNeeded = ethers.parseEther("0.001"); // ~1-2 milioni gas * 2 gwei
  console.log("🔧 Estimated needed for Uniswap ops:", ethers.formatEther(estimatedGasNeeded), "ETH");
  
  if (balance >= estimatedGasNeeded) {
    console.log("✅ Hai abbastanza ETH per continuare!");
  } else {
    const needed = estimatedGasNeeded - balance;
    console.log("❌ Ti servono altri", ethers.formatEther(needed), "ETH");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
