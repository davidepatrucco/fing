const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(80));
  console.log("🚀 OPZIONE B - Uniswap v3 LP NFT + Timelock Workflow");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  // Environment variables with micro amounts for demo
  const FIA_ADDR = process.env.FIA_ADDR;
  const AMOUNT_FIA = "10000000"; // 10M FIA 
  const AMOUNT_ETH = "0.00005"; // 0.00005 ETH (very small for demo)
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
  console.log(`   Position Manager: ${POS_MANAGER}`);
  console.log("");

  console.log("💰 STEP 1: Check balances...");
  
  // Load FIA contract
  const FIA = await hre.ethers.getContractAt("FIACoin", FIA_ADDR);
  
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  const fiaBalance = await FIA.balanceOf(deployer.address);
  
  console.log(`   ETH: ${hre.ethers.formatEther(ethBalance)} ETH`);
  console.log(`   FIA: ${hre.ethers.formatUnits(fiaBalance, 18)} FIA`);

  const requiredFIA = hre.ethers.parseUnits(AMOUNT_FIA, 18);
  const requiredETH = hre.ethers.parseEther(AMOUNT_ETH);

  if (fiaBalance < requiredFIA) {
    throw new Error(`❌ Insufficient FIA balance. Need ${AMOUNT_FIA}, have ${hre.ethers.formatUnits(fiaBalance, 18)}`);
  }
  if (ethBalance < requiredETH + hre.ethers.parseEther("0.00002")) { // Minimal gas reserve
    throw new Error(`❌ Insufficient ETH balance. Need ${AMOUNT_ETH} + gas, have ${hre.ethers.formatEther(ethBalance)}`);
  }

  console.log("✅ Balances sufficient");
  console.log("");

  console.log("📖 STEP 2: Load Position Manager...");
  
  // Load NonfungiblePositionManager ABI
  const abiPath = path.join(__dirname, "abis", "NonfungiblePositionManager.json");
  if (!fs.existsSync(abiPath)) {
    throw new Error(`❌ ABI file not found: ${abiPath}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const posManagerABI = artifact.abi; // Extract ABI from Hardhat artifact
  const positionManager = new hre.ethers.Contract(POS_MANAGER, posManagerABI, deployer);
  
  console.log("✅ Position Manager loaded");
  console.log("");

  console.log("💰 STEP 3: Approve FIA tokens...");
  
  const fiaAllowance = await FIA.allowance(deployer.address, POS_MANAGER);
  console.log(`   Current FIA allowance: ${hre.ethers.formatUnits(fiaAllowance, 18)}`);

  if (fiaAllowance < requiredFIA) {
    console.log("   📝 Approving FIA...");
    
    // Set gas prices explicitly
    const gasPrice = {
      maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
      maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei")
    };
    
    const approveTx = await FIA.approve(POS_MANAGER, requiredFIA, gasPrice);
    console.log(`   📝 Approval sent: ${approveTx.hash}`);
    
    const receipt = await approveTx.wait();
    console.log(`   ✅ FIA approved! Block: ${receipt?.blockNumber}`);
  } else {
    console.log("   ✅ FIA already approved");
  }
  console.log("");

  console.log("🎨 STEP 4: Prepare mint parameters...");
  
  // Calculate token order (Uniswap requires token0 < token1)
  const token0 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? FIA_ADDR : WETH_ADDR;
  const token1 = FIA_ADDR.toLowerCase() < WETH_ADDR.toLowerCase() ? WETH_ADDR : FIA_ADDR;
  const amount0 = token0.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;
  const amount1 = token1.toLowerCase() === FIA_ADDR.toLowerCase() ? requiredFIA : requiredETH;

  console.log(`   Token0 (${token0}): ${token0.toLowerCase() === FIA_ADDR.toLowerCase() ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);
  console.log(`   Token1 (${token1}): ${token1.toLowerCase() === FIA_ADDR.toLowerCase() ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);

  const fee = 3000; // 0.3%
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

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
    deadline: deadline
  };

  // Send ETH as value (for WETH)
  const ethValue = token0.toLowerCase() === WETH_ADDR.toLowerCase() ? amount0 : amount1;
  console.log(`   Will send ${hre.ethers.formatEther(ethValue)} ETH as msg.value`);
  console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()}`);
  console.log("");

  console.log("🎨 STEP 5: Mint LP NFT Position...");
  
  try {
    const gasPrice = {
      maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
      maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei"),
      gasLimit: 500000
    };
    
    console.log("   📝 Sending mint transaction...");
    const mintTx = await positionManager.mint(mintParams, { 
      value: ethValue,
      ...gasPrice
    });
    
    console.log(`   📝 Mint sent: ${mintTx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    
    const mintReceipt = await mintTx.wait();
    
    if (mintReceipt?.status === 0) {
      throw new Error("❌ Mint transaction failed");
    }
    
    console.log(`   ✅ LP NFT minted! Block: ${mintReceipt?.blockNumber}`);
    console.log("");

    console.log("🔍 STEP 6: Extract tokenId from transaction...");
    
    let tokenId = null;
    
    // Look for Transfer event (mint = transfer from 0x0)
    for (const log of mintReceipt?.logs || []) {
      try {
        const parsedLog = positionManager.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsedLog?.name === "Transfer" && parsedLog.args.from === hre.ethers.ZeroAddress) {
          tokenId = parsedLog.args.tokenId;
          console.log(`   🎨 Found Transfer event - tokenId: ${tokenId.toString()}`);
          break;
        }
      } catch (e) {
        // Skip invalid logs
      }
    }

    if (!tokenId) {
      // Try IncreaseLiquidity event as fallback
      for (const log of mintReceipt?.logs || []) {
        try {
          const parsedLog = positionManager.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog?.name === "IncreaseLiquidity") {
            tokenId = parsedLog.args.tokenId;
            console.log(`   📈 Found IncreaseLiquidity event - tokenId: ${tokenId.toString()}`);
            break;
          }
        } catch (e) {
          // Skip invalid logs
        }
      }
    }

    if (!tokenId) {
      console.log("   ❌ Could not extract tokenId from events");
      console.log("   📋 Available events:");
      for (const log of mintReceipt?.logs || []) {
        try {
          const parsedLog = positionManager.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          console.log(`      - ${parsedLog?.name}: ${JSON.stringify(parsedLog?.args)}`);
        } catch (e) {
          console.log(`      - Raw log: ${log.topics[0]}`);
        }
      }
      throw new Error("❌ Could not extract tokenId from mint transaction");
    }

    console.log(`   ✅ LP NFT tokenId: ${tokenId.toString()}`);
    console.log("");

    console.log("🔒 STEP 7: Deploy NFTTimelock contract...");
    
    const unlockTime = Math.floor(Date.now() / 1000) + (UNLOCK_DAYS * 24 * 60 * 60);
    const unlockDate = new Date(unlockTime * 1000);
    console.log(`   ⏰ Unlock time: ${unlockDate.toISOString()}`);
    
    const NFTTimelock = await hre.ethers.getContractFactory("NFTTimelock");
    const timelock = await NFTTimelock.deploy(POS_MANAGER, tokenId, unlockTime, gasPrice);
    await timelock.waitForDeployment();
    
    const timelockAddr = await timelock.getAddress();
    console.log(`   ✅ NFTTimelock deployed at: ${timelockAddr}`);
    console.log("");

    console.log("🔄 STEP 8: Approve timelock for NFT transfer...");
    
    const approveTx = await positionManager.approve(timelockAddr, tokenId, gasPrice);
    console.log(`   📝 Approval sent: ${approveTx.hash}`);
    
    const approveReceipt = await approveTx.wait();
    console.log(`   ✅ NFT approved! Block: ${approveReceipt?.blockNumber}`);
    console.log("");
    
    console.log("🔄 STEP 9: Transfer LP NFT to timelock...");
    
    const transferTx = await positionManager["safeTransferFrom(address,address,uint256)"](
      deployer.address, 
      timelockAddr, 
      tokenId,
      gasPrice
    );
    console.log(`   📝 Transfer sent: ${transferTx.hash}`);
    
    const transferReceipt = await transferTx.wait();
    console.log(`   ✅ NFT transferred! Block: ${transferReceipt?.blockNumber}`);
    console.log("");

    console.log("✅ STEP 10: Final verification...");
    
    const nftOwner = await positionManager.ownerOf(tokenId);
    const isLocked = nftOwner.toLowerCase() === timelockAddr.toLowerCase();
    
    console.log(`   🎨 NFT tokenId: ${tokenId.toString()}`);
    console.log(`   👤 Current owner: ${nftOwner}`);
    console.log(`   🔒 Timelock contract: ${timelockAddr}`);
    console.log(`   ✅ NFT is locked: ${isLocked ? 'YES' : 'NO'}`);
    
    if (!isLocked) {
      throw new Error("❌ NFT transfer verification failed!");
    }
    
    console.log("");

    // Final Success Summary
    console.log("=".repeat(80));
    console.log("🎉 OPZIONE B COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log(`🎨 LP NFT TokenId: ${tokenId.toString()}`);
    console.log(`🔒 Timelock Contract: ${timelockAddr}`);
    console.log(`⏰ Unlock Date: ${unlockDate.toISOString()}`);
    console.log(`🔗 Check Timelock: https://sepolia.basescan.org/address/${timelockAddr}`);
    console.log(`🔗 Check NFT: https://sepolia.basescan.org/token/${POS_MANAGER}?a=${tokenId}`);
    console.log(`🔗 Verify Owner: https://sepolia.basescan.org/token/${POS_MANAGER}?a=${tokenId}#inventory`);
    console.log("");
    console.log("📋 What happened:");
    console.log(`   1. ✅ Created Uniswap v3 LP position (FIA/WETH)`);
    console.log(`   2. ✅ Received NFT tokenId ${tokenId.toString()}`);
    console.log(`   3. ✅ Deployed NFTTimelock at ${timelockAddr}`);
    console.log(`   4. ✅ Transferred NFT to timelock (LOCKED until ${unlockDate.toISOString()})`);
    console.log(`   5. ✅ BaseScan shows owner = timelock ✨`);
    console.log("=".repeat(80));

  } catch (error) {
    console.error("❌ Error during mint:", error.message);
    
    if (error.message.includes("STF") || error.message.includes("STE")) {
      console.log("💡 Pool creation or swap error detected:");
      console.log("   - The pool might not exist yet");
      console.log("   - Try creating the pool first with create-pool.ts");
      console.log("   - Or adjust token amounts");
    }
    
    if (error.message.includes("Insufficient")) {
      console.log("💡 Insufficient balance error:");
      console.log("   - Check your FIA and ETH balances");
      console.log("   - Reduce AMOUNT_FIA or AMOUNT_WETH in .env");
    }
    
    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Final Error:", error);
  console.log("\n📋 Troubleshooting:");
  console.log("   1. Check your .env file has FIA_ADDR set");
  console.log("   2. Ensure you have enough FIA and ETH");
  console.log("   3. Try creating the pool first: npx hardhat run scripts/create-pool.ts --network baseSepolia");
  console.log("   4. Check Base Sepolia network is working");
  
  process.exitCode = 1;
});
