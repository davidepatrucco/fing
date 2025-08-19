import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const ethers = hre.ethers;
  
  console.log("=".repeat(80));
  console.log("🚀 OPZIONE B - Uniswap v3 LP NFT + Timelock Workflow");
  console.log("=".repeat(80));

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  // Environment variables
  const FIA_ADDR = process.env.FIA_ADDR;
  const AMOUNT_FIA = process.env.AMOUNT_FIA || "500000000"; // 500M FIA
  const AMOUNT_ETH = process.env.AMOUNT_WETH || "0.1"; // 0.1 ETH
  const UNLOCK_DAYS = parseInt(process.env.UNLOCK_DAYS || "10");

  // Uniswap v3 addresses on Base Sepolia
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  const WETH_ADDR = "0x4200000000000000000000000000000000000006";
  const FACTORY_ADDR = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

  if (!FIA_ADDR) {
    throw new Error("❌ Set FIA_ADDR environment variable");
  }

  console.log("📋 Configuration:");
  console.log(`   FIA Token: ${FIA_ADDR}`);
  console.log(`   FIA Amount: ${AMOUNT_FIA} tokens`);
  console.log(`   ETH Amount: ${AMOUNT_ETH} ETH`);
  console.log(`   Lock Days: ${UNLOCK_DAYS} days`);
  console.log("");

  // Load contracts
  console.log("📖 Loading contracts...");
  const FIA = await ethers.getContractAt("FIACoin", FIA_ADDR);
  
  // Load NonfungiblePositionManager ABI
  const abiPath = path.join(__dirname, "abis", "NonfungiblePositionManager.json");
  if (!fs.existsSync(abiPath)) {
    throw new Error(`❌ ABI file not found: ${abiPath}`);
  }
  
  const posManagerABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const positionManager = new ethers.Contract(POS_MANAGER, posManagerABI, deployer);

  // Check balances
  console.log("💰 Checking balances...");
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  const fiaBalance = await FIA.balanceOf(deployer.address);
  
  console.log(`   ETH: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`   FIA: ${ethers.formatUnits(fiaBalance, 18)} FIA`);

  const requiredFIA = ethers.parseUnits(AMOUNT_FIA, 18);
  const requiredETH = ethers.parseEther(AMOUNT_ETH);

  if (fiaBalance < requiredFIA) {
    throw new Error(`❌ Insufficient FIA balance. Need ${AMOUNT_FIA}, have ${ethers.formatUnits(fiaBalance, 18)}`);
  }
  if (ethBalance < requiredETH + ethers.parseEther("0.01")) { // Extra for gas
    throw new Error(`❌ Insufficient ETH balance. Need ${AMOUNT_ETH} + gas, have ${ethers.formatEther(ethBalance)}`);
  }

  console.log("✅ Balances sufficient");
  console.log("");

  // STEP 1: Check if pool exists
  console.log("🔍 STEP 1: Check if FIA/WETH pool exists...");
  
  const factoryABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)"
  ];
  const factory = new ethers.Contract(FACTORY_ADDR, factoryABI, deployer);
  const fee = 3000; // 0.3%
  
  let poolAddr = await factory.getPool(FIA_ADDR, WETH_ADDR, fee);
  console.log(`   Pool address: ${poolAddr}`);

  if (poolAddr === ethers.ZeroAddress) {
    console.log("⚠️  Pool doesn't exist. You need to create it manually or use existing pool.");
    console.log("   For this demo, let's try to find an existing pool or create one via Position Manager...");
  } else {
    console.log("   ✅ Pool already exists!");
  }

  // STEP 2: Approve FIA tokens
  console.log("💰 STEP 2: Approve FIA tokens to PositionManager...");
  
  const fiaAllowance = await FIA.allowance(deployer.address, POS_MANAGER);
  console.log(`   Current FIA allowance: ${ethers.formatUnits(fiaAllowance, 18)}`);

  if (fiaAllowance < requiredFIA) {
    console.log("   📝 Approving FIA...");
    const approveTx = await FIA.approve(POS_MANAGER, requiredFIA);
    await approveTx.wait();
    console.log(`   ✅ FIA approved! Tx: ${approveTx.hash}`);
  } else {
    console.log("   ✅ FIA already approved");
  }
  console.log("");

  // STEP 3: Mint LP NFT Position (with pool creation if needed)
  console.log("🎨 STEP 3: Mint Uniswap v3 LP NFT...");
  
  // Calculate token order (Uniswap requires token0 < token1)
  const token0 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? FIA_ADDR : WETH_ADDR;
  const token1 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? WETH_ADDR : FIA_ADDR;
  const amount0 = token0.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;
  const amount1 = token1.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;

  console.log(`   Token0 (${token0}): ${token0.toLowerCase() === FIA_ADDR.toLowerCase() ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);
  console.log(`   Token1 (${token1}): ${token1.toLowerCase() === FIA_ADDR.toLowerCase() ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);

  const mintParams = {
    token0: token0,
    token1: token1,
    fee: fee,
    tickLower: -887220, // Full range
    tickUpper: 887220,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 1800 // 30 minutes
  };

  // Send ETH as value
  const ethValue = token0.toLowerCase() === WETH_ADDR.toLowerCase() ? amount0 : amount1;
  console.log(`   Sending ${ethers.formatEther(ethValue)} ETH as msg.value`);

  try {
    const mintTx = await positionManager.mint(mintParams, { 
      value: ethValue,
      gasLimit: 500000 // Set explicit gas limit
    });
    const mintReceipt = await mintTx.wait();
    
    console.log(`   ✅ LP NFT minted! Tx: ${mintReceipt?.hash}`);
    
    // Find Transfer event to get tokenId
    let tokenId = null;
    for (const log of mintReceipt?.logs || []) {
      try {
        const parsedLog = positionManager.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsedLog?.name === "Transfer" && parsedLog.args.from === ethers.ZeroAddress) {
          tokenId = parsedLog.args.tokenId;
          break;
        }
      } catch (e) {
        // Skip invalid logs
      }
    }

    if (!tokenId) {
      // Try to get from IncreaseLiquidity event
      for (const log of mintReceipt?.logs || []) {
        try {
          const parsedLog = positionManager.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog?.name === "IncreaseLiquidity") {
            tokenId = parsedLog.args.tokenId;
            break;
          }
        } catch (e) {
          // Skip invalid logs
        }
      }
    }

    if (!tokenId) {
      throw new Error("❌ Could not extract tokenId from mint transaction");
    }

    console.log(`   🎨 LP NFT tokenId: ${tokenId.toString()}`);
    console.log("");

    // STEP 4: Deploy NFTTimelock
    console.log("🔒 STEP 4: Deploy NFTTimelock contract...");
    
    const unlockTime = Math.floor(Date.now() / 1000) + (UNLOCK_DAYS * 24 * 60 * 60);
    const unlockDate = new Date(unlockTime * 1000);
    console.log(`   Unlock time: ${unlockDate.toISOString()}`);
    
    const NFTTimelock = await ethers.getContractFactory("NFTTimelock");
    const timelock = await NFTTimelock.deploy(POS_MANAGER, tokenId, unlockTime);
    await timelock.waitForDeployment();
    
    const timelockAddr = await timelock.getAddress();
    console.log(`   ✅ NFTTimelock deployed at: ${timelockAddr}`);
    console.log("");

    // STEP 5: Approve and Transfer NFT
    console.log("🔄 STEP 5: Transfer LP NFT to timelock...");
    
    console.log("   📝 Approving timelock to transfer NFT...");
    const approveTx = await positionManager.approve(timelockAddr, tokenId);
    await approveTx.wait();
    console.log(`   ✅ NFT approved! Tx: ${approveTx.hash}`);
    
    console.log("   🔄 Transferring NFT to timelock...");
    const transferTx = await positionManager["safeTransferFrom(address,address,uint256)"](
      deployer.address, 
      timelockAddr, 
      tokenId
    );
    await transferTx.wait();
    console.log(`   ✅ NFT transferred! Tx: ${transferTx.hash}`);
    console.log("");

    // STEP 6: Verification
    console.log("✅ STEP 6: Verification...");
    
    const nftOwner = await positionManager.ownerOf(tokenId);
    console.log(`   🎨 NFT tokenId ${tokenId} owner: ${nftOwner}`);
    console.log(`   🔒 Timelock contract: ${timelockAddr}`);
    console.log(`   ✅ NFT is locked: ${nftOwner.toLowerCase() === timelockAddr.toLowerCase() ? 'YES' : 'NO'}`);
    console.log("");

    // Summary
    console.log("=".repeat(80));
    console.log("🎉 OPZIONE B COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log(`🎨 LP NFT TokenId: ${tokenId.toString()}`);
    console.log(`🔒 Timelock Contract: ${timelockAddr}`);
    console.log(`⏰ Unlock Date: ${unlockDate.toISOString()}`);
    console.log(`🔗 Check Timelock: https://sepolia.basescan.org/address/${timelockAddr}`);
    console.log(`🔗 Check NFT: https://sepolia.basescan.org/token/${POS_MANAGER}?a=${tokenId}`);
    console.log("=".repeat(80));

  } catch (error: any) {
    console.error("❌ Error during mint:", error.message);
    
    if (error.message.includes("STF")) {
      console.log("💡 This might be a 'STF' (Swap To Insufficient) error.");
      console.log("   Try adjusting amounts or using a different fee tier.");
    }
    
    if (error.message.includes("pool")) {
      console.log("💡 Pool might not exist. Try creating it first:");
      console.log(`   cd /Users/davide.patrucco/Desktop/Personal/finger/fia-hardhat`);
      console.log(`   npx hardhat run scripts/create-pool.ts --network baseSepolia`);
    }
    
    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
