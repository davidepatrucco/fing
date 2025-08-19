const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 OPZIONE B - Using Pre-calculated Pool Address");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  const FIA_ADDR = "0x21Fd5229c940eDEdf0286678A0b5E34e4b0281e4";
  const WETH_ADDR = "0x4200000000000000000000000000000000000006";
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  const POOL_ADDR = "0x5d0B9197243e3018ABda8a49CeBf23B249e02009"; // From simulation
  
  const AMOUNT_FIA = "1000000"; // 1M FIA (molto ridotto)
  const AMOUNT_ETH = "0.00001"; // 0.00001 ETH (molto ridotto)
  const UNLOCK_DAYS = 10;

  console.log("📋 Configuration:");
  console.log(`   FIA Token: ${FIA_ADDR}`);
  console.log(`   WETH: ${WETH_ADDR}`);
  console.log(`   Pool Address: ${POOL_ADDR}`);
  console.log(`   Position Manager: ${POS_MANAGER}`);
  console.log("");

  // Check balances
  console.log("💰 STEP 1: Check balances...");
  const FIA = await hre.ethers.getContractAt("FIACoin", FIA_ADDR);
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  const fiaBalance = await FIA.balanceOf(deployer.address);
  
  console.log(`   ETH: ${hre.ethers.formatEther(ethBalance)} ETH`);
  console.log(`   FIA: ${hre.ethers.formatUnits(fiaBalance, 18)} FIA`);

  const requiredFIA = hre.ethers.parseUnits(AMOUNT_FIA, 18);
  const requiredETH = hre.ethers.parseEther(AMOUNT_ETH);

  if (fiaBalance < requiredFIA || ethBalance < requiredETH + hre.ethers.parseEther("0.00002")) {
    throw new Error("❌ Insufficient balance");
  }
  console.log("✅ Balances sufficient");

  // Check if pool exists and is initialized
  console.log("\n🔍 STEP 2: Check pool status...");
  
  const poolABI = [
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)"
  ];
  
  const poolCode = await hre.ethers.provider.getCode(POOL_ADDR);
  console.log(`   Pool code length: ${poolCode.length}`);
  console.log(`   Pool exists: ${poolCode !== "0x" ? "✅" : "❌"}`);
  
  if (poolCode === "0x") {
    console.log("   ❌ Pool doesn't exist yet, but we know its address");
    console.log("   💡 Let's try to initialize it via mint...");
  } else {
    console.log("   ✅ Pool contract exists!");
    
    try {
      const pool = new hre.ethers.Contract(POOL_ADDR, poolABI, deployer);
      const slot0 = await pool.slot0();
      console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`   tick: ${slot0.tick.toString()}`);
      console.log(`   unlocked: ${slot0.unlocked}`);
    } catch (e) {
      console.log(`   ⚠️  Could not read pool state: ${e.message}`);
    }
  }

  // Load Position Manager with proper ABI
  console.log("\n📖 STEP 3: Load Position Manager...");
  const abiPath = path.join(__dirname, "abis", "NonfungiblePositionManager.json");
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const posManagerABI = artifact.abi;
  const positionManager = new hre.ethers.Contract(POS_MANAGER, posManagerABI, deployer);

  // Approve FIA
  console.log("\n💰 STEP 4: Approve FIA tokens...");
  const fiaAllowance = await FIA.allowance(deployer.address, POS_MANAGER);
  console.log(`   Current allowance: ${hre.ethers.formatUnits(fiaAllowance, 18)}`);

  if (fiaAllowance < requiredFIA) {
    const gasPrice = {
      maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
      maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei")
    };
    
    const approveTx = await FIA.approve(POS_MANAGER, requiredFIA, gasPrice);
    await approveTx.wait();
    console.log(`   ✅ FIA approved: ${approveTx.hash}`);
  } else {
    console.log("   ✅ Already approved");
  }

  // Prepare mint parameters
  console.log("\n🎨 STEP 5: Mint with createAndInitializePoolIfNecessary...");
  
  // Use the createAndInitializePoolIfNecessary function
  const token0 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? FIA_ADDR : WETH_ADDR;
  const token1 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? WETH_ADDR : FIA_ADDR;
  const amount0 = token0.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;
  const amount1 = token1.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;
  
  console.log(`   Token0: ${token0} (${token0 === FIA_ADDR ? 'FIA' : 'WETH'})`);
  console.log(`   Token1: ${token1} (${token1 === FIA_ADDR ? 'FIA' : 'WETH'})`);
  
  // Calculate initial price: 1 ETH = 200,000 FIA (esempio)
  const price = 200000; // FIA per ETH
  const sqrtPriceX96 = BigInt(Math.sqrt(price) * (2 ** 96));
  
  console.log(`   Initial sqrtPriceX96: ${sqrtPriceX96.toString()}`);
  
  const gasPrice = {
    maxFeePerGas: hre.ethers.parseUnits("0.02", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
    gasLimit: 3000000
  };
  
  try {
    // First, try to create and initialize pool if necessary
    console.log("   📝 Creating/initializing pool...");
    const createTx = await positionManager.createAndInitializePoolIfNecessary(
      token0,
      token1,
      3000, // fee
      sqrtPriceX96,
      gasPrice
    );
    
    console.log(`   📝 Create/init sent: ${createTx.hash}`);
    const createReceipt = await createTx.wait();
    
    if (createReceipt.status === 1) {
      console.log(`   ✅ Pool created/initialized! Block: ${createReceipt.blockNumber}`);
    } else {
      console.log("   ⚠️  Create/init status unclear, continuing...");
    }
    
  } catch (error) {
    console.log(`   ⚠️  Create/init failed: ${error.message}`);
    console.log("   💡 Pool might already exist, continuing with mint...");
  }
  
  // Now try to mint
  console.log("\n🎨 STEP 6: Mint LP NFT...");
  
  const mintParams = {
    token0: token0,
    token1: token1,
    fee: 3000,
    tickLower: -887220, // Full range
    tickUpper: 887220,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 1800
  };

  const ethValue = token0.toLowerCase() === WETH_ADDR.toLowerCase() ? amount0 : amount1;
  console.log(`   Sending ${hre.ethers.formatEther(ethValue)} ETH as value`);

  try {
    const mintTx = await positionManager.mint(mintParams, { 
      value: ethValue,
      ...gasPrice
    });
    
    console.log(`   📝 Mint sent: ${mintTx.hash}`);
    const mintReceipt = await mintTx.wait();
    
    if (mintReceipt.status === 1) {
      console.log(`   ✅ LP NFT minted! Block: ${mintReceipt.blockNumber}`);
      
      // Extract tokenId
      let tokenId = null;
      for (const log of mintReceipt.logs) {
        try {
          const parsedLog = positionManager.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog?.name === "Transfer" && parsedLog.args.from === hre.ethers.ZeroAddress) {
            tokenId = parsedLog.args.tokenId;
            break;
          }
        } catch (e) {
          // Skip
        }
      }
      
      if (tokenId) {
        console.log(`   🎨 LP NFT tokenId: ${tokenId.toString()}`);
        
        // Deploy NFTTimelock
        console.log("\n🔒 STEP 7: Deploy NFTTimelock...");
        const unlockTime = Math.floor(Date.now() / 1000) + (UNLOCK_DAYS * 24 * 60 * 60);
        
        const NFTTimelock = await hre.ethers.getContractFactory("NFTTimelock");
        const timelock = await NFTTimelock.deploy(POS_MANAGER, tokenId, unlockTime, gasPrice);
        await timelock.waitForDeployment();
        
        const timelockAddr = await timelock.getAddress();
        console.log(`   ✅ NFTTimelock deployed: ${timelockAddr}`);
        
        // Transfer NFT
        console.log("\n🔄 STEP 8: Transfer NFT to timelock...");
        
        const approveTx = await positionManager.approve(timelockAddr, tokenId, gasPrice);
        await approveTx.wait();
        console.log(`   ✅ NFT approved: ${approveTx.hash}`);
        
        const transferTx = await positionManager["safeTransferFrom(address,address,uint256)"](
          deployer.address, 
          timelockAddr, 
          tokenId,
          gasPrice
        );
        await transferTx.wait();
        console.log(`   ✅ NFT transferred: ${transferTx.hash}`);
        
        // Verify
        const nftOwner = await positionManager.ownerOf(tokenId);
        console.log(`\n✅ VERIFICATION:`);
        console.log(`   NFT tokenId: ${tokenId.toString()}`);
        console.log(`   Owner: ${nftOwner}`);
        console.log(`   Timelock: ${timelockAddr}`);
        console.log(`   Locked: ${nftOwner.toLowerCase() === timelockAddr.toLowerCase() ? '✅' : '❌'}`);
        
        if (nftOwner.toLowerCase() === timelockAddr.toLowerCase()) {
          console.log("\n🎉 OPZIONE B COMPLETED SUCCESSFULLY! 🎉");
          console.log(`🔗 Check: https://sepolia.basescan.org/token/${POS_MANAGER}?a=${tokenId}`);
        }
        
      } else {
        console.log("   ❌ Could not extract tokenId");
      }
      
    } else {
      console.log(`   ❌ Mint failed with status: ${mintReceipt.status}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Mint failed: ${error.message}`);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
