const hre = require("hardhat");

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 OPZIONE B - NFT Timelock Demo (Senza Mint)");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  // Environment variables
  const FIA_ADDR = process.env.FIA_ADDR;
  const UNLOCK_DAYS = parseInt(process.env.UNLOCK_DAYS || "10");

  // Uniswap v3 addresses on Base Sepolia
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";

  if (!FIA_ADDR) {
    throw new Error("❌ Set FIA_ADDR environment variable");
  }

  console.log("📋 Configuration:");
  console.log(`   FIA Token: ${FIA_ADDR}`);
  console.log(`   Position Manager: ${POS_MANAGER}`);
  console.log(`   Lock Days: ${UNLOCK_DAYS} days`);
  console.log("");

  console.log("💰 STEP 1: Check balance...");
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   ETH: ${hre.ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance < hre.ethers.parseEther("0.00003")) {
    throw new Error("❌ Need at least 0.00003 ETH for deployment gas");
  }
  console.log("✅ Balance sufficient for deployment");
  console.log("");

  console.log("🔒 STEP 2: Deploy NFTTimelock contract...");
  
  // For demo purposes, use a hypothetical tokenId (we'll explain this is the NFT from LP mint)
  const demoTokenId = 12345; // In real scenario, this comes from LP mint
  const unlockTime = Math.floor(Date.now() / 1000) + (UNLOCK_DAYS * 24 * 60 * 60);
  const unlockDate = new Date(unlockTime * 1000);
  
  console.log(`   📍 Demo tokenId: ${demoTokenId} (simulated LP NFT)`);
  console.log(`   ⏰ Unlock time: ${unlockDate.toISOString()}`);
  
  const gasPrice = {
    maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei"),
    gasLimit: 300000
  };
  
  const NFTTimelock = await hre.ethers.getContractFactory("NFTTimelock");
  const timelock = await NFTTimelock.deploy(POS_MANAGER, demoTokenId, unlockTime, gasPrice);
  
  console.log(`   📝 Deploy sent: ${timelock.deploymentTransaction()?.hash}`);
  console.log("   ⏳ Waiting for deployment...");
  
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  
  console.log(`   ✅ NFTTimelock deployed at: ${timelockAddr}`);
  console.log("");

  console.log("📋 STEP 3: Contract verification...");
  
  const owner = await timelock.owner();
  const nftContract = await timelock.nft();
  const lockedTokenId = await timelock.tokenId();
  const unlockTimestamp = await timelock.unlockTime();
  
  console.log(`   👤 Owner: ${owner}`);
  console.log(`   🎨 NFT Contract: ${nftContract}`);
  console.log(`   🔢 TokenId: ${lockedTokenId.toString()}`);
  console.log(`   ⏰ Unlock Time: ${new Date(Number(unlockTimestamp) * 1000).toISOString()}`);
  console.log("");

  console.log("📝 STEP 4: Generate verification info...");
  
  const constructorArgs = [POS_MANAGER, demoTokenId, unlockTime];
  const abiCoder = new hre.ethers.AbiCoder();
  const encodedArgs = abiCoder.encode(
    ["address", "uint256", "uint256"],
    constructorArgs
  );
  
  console.log("   Constructor arguments for verification:");
  console.log(`   _nft: ${POS_MANAGER}`);
  console.log(`   _tokenId: ${demoTokenId}`);
  console.log(`   _unlockTime: ${unlockTime}`);
  console.log(`   Encoded: ${encodedArgs.slice(2)}`); // Remove 0x prefix
  console.log("");

  // Final Success Summary  
  console.log("=".repeat(80));
  console.log("🎉 OPZIONE B DEMO COMPLETED!");
  console.log("=".repeat(80));
  console.log("📋 What this demonstrates:");
  console.log(`   1. ✅ NFTTimelock contract deployed at ${timelockAddr}`);
  console.log(`   2. ✅ Configured for Uniswap v3 Position Manager`);
  console.log(`   3. ✅ Set to lock tokenId ${demoTokenId} until ${unlockDate.toISOString()}`);
  console.log(`   4. ✅ Ready for verification on BaseScan`);
  console.log("");
  console.log("🔗 Links:");
  console.log(`   Contract: https://sepolia.basescan.org/address/${timelockAddr}`);
  console.log(`   Verify: https://sepolia.basescan.org/verifyContract?a=${timelockAddr}`);
  console.log("");
  console.log("📖 Complete Opzione B workflow:");
  console.log("   1. Create Uniswap v3 LP position → get NFT tokenId");
  console.log("   2. Deploy NFTTimelock (already done ✅)");
  console.log("   3. Call positionManager.approve(timelock, tokenId)");
  console.log("   4. Call positionManager.safeTransferFrom(wallet, timelock, tokenId)");
  console.log("   5. BaseScan shows owner = timelock ✨");
  console.log("");
  console.log("💡 Next steps:");
  console.log("   - Create actual LP position when pool exists");
  console.log("   - Use real tokenId instead of demo value");
  console.log("   - Transfer real NFT to this timelock");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
