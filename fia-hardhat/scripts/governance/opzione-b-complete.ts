import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

// Indirizzi Uniswap v3 su Base Sepolia
const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
const WETH_ADDR = "0x4200000000000000000000000000000000000006";
const FACTORY_ADDR = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

async function main() {
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
  if (ethBalance < requiredETH) {
    throw new Error(`❌ Insufficient ETH balance. Need ${AMOUNT_ETH}, have ${ethers.formatEther(ethBalance)}`);
  }

  console.log("✅ Balances sufficient");
  console.log("");

  // STEP 1: Check/Create Pool
  console.log("🔍 STEP 1: Check if FIA/WETH pool exists...");
  
  const factory = await ethers.getContractAt("IUniswapV3Factory", FACTORY_ADDR);
  const fee = 3000; // 0.3%
  
  let poolAddr = await factory.getPool(FIA_ADDR, WETH_ADDR, fee);
  console.log(`   Pool address: ${poolAddr}`);

  if (poolAddr === ethers.ZeroAddress) {
    console.log("   ❌ Pool doesn't exist, creating it...");
    
    // Create pool
    const createPoolTx = await factory.createPool(FIA_ADDR, WETH_ADDR, fee);
    const receipt = await createPoolTx.wait();
    console.log(`   ✅ Pool created! Tx: ${receipt?.hash}`);
    
    poolAddr = await factory.getPool(FIA_ADDR, WETH_ADDR, fee);
    console.log(`   📍 New pool address: ${poolAddr}`);

    // Initialize pool
    console.log("   🎯 Initializing pool...");
    const pool = await ethers.getContractAt("IUniswapV3Pool", poolAddr);
    
    // Calculate initial price (1 ETH = X FIA tokens)
    // For simplicity, let's set 1 ETH = 1,000,000 FIA
    const price = ethers.parseUnits("1000000", 18); // 1M FIA per ETH
    const sqrtPriceX96 = calculateSqrtPriceX96(price);
    
    const initTx = await pool.initialize(sqrtPriceX96);
    await initTx.wait();
    console.log(`   ✅ Pool initialized! Tx: ${initTx.hash}`);
  } else {
    console.log("   ✅ Pool already exists!");
  }
  console.log("");

  // STEP 2: Approve tokens
  console.log("💰 STEP 2: Approve tokens to PositionManager...");
  
  // Check current allowances
  const fiaAllowance = await FIA.allowance(deployer.address, POS_MANAGER);
  const wethContract = await ethers.getContractAt("IWETH9", WETH_ADDR);
  
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

  // STEP 3: Mint LP NFT Position
  console.log("🎨 STEP 3: Mint Uniswap v3 LP NFT...");
  
  // Calculate token order
  const token0 = FIA_ADDR < WETH_ADDR ? FIA_ADDR : WETH_ADDR;
  const token1 = FIA_ADDR < WETH_ADDR ? WETH_ADDR : FIA_ADDR;
  const amount0 = token0 === FIA_ADDR ? requiredFIA : requiredETH;
  const amount1 = token1 === FIA_ADDR ? requiredFIA : requiredETH;

  console.log(`   Token0 (${token0}): ${token0 === FIA_ADDR ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);
  console.log(`   Token1 (${token1}): ${token1 === FIA_ADDR ? AMOUNT_FIA + ' FIA' : AMOUNT_ETH + ' ETH'}`);

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
    deadline: Math.floor(Date.now() / 1000) + 300 // 5 minutes
  };

  const value = token0 === WETH_ADDR ? amount0 : amount1; // ETH value to send
  console.log(`   Sending ${ethers.formatEther(value)} ETH as msg.value`);

  const mintTx = await positionManager.mint(mintParams, { value });
  const mintReceipt = await mintTx.wait();
  
  console.log(`   ✅ LP NFT minted! Tx: ${mintReceipt?.hash}`);
  
  // Extract tokenId from events
  const mintEvent = mintReceipt?.logs.find((log: any) => {
    try {
      const parsedLog = positionManager.interface.parseLog(log);
      return parsedLog?.name === "IncreaseLiquidity" || parsedLog?.name === "Transfer";
    } catch {
      return false;
    }
  });

  if (!mintEvent) {
    throw new Error("❌ Could not find mint event to extract tokenId");
  }

  const parsedEvent = positionManager.interface.parseLog(mintEvent);
  const tokenId = parsedEvent?.args?.tokenId || parsedEvent?.args?.[2]; // Try different positions
  
  if (!tokenId) {
    throw new Error("❌ Could not extract tokenId from mint event");
  }

  console.log(`   🎨 LP NFT tokenId: ${tokenId.toString()}`);
  console.log("");

  // STEP 4: Deploy NFTTimelock
  console.log("🔒 STEP 4: Deploy NFTTimelock contract...");
  
  const unlockTime = Math.floor(Date.now() / 1000) + (UNLOCK_DAYS * 24 * 60 * 60);
  console.log(`   Unlock time: ${new Date(unlockTime * 1000).toISOString()}`);
  
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
  const transferTx = await positionManager.safeTransferFrom(deployer.address, timelockAddr, tokenId);
  await transferTx.wait();
  console.log(`   ✅ NFT transferred! Tx: ${transferTx.hash}`);
  console.log("");

  // STEP 6: Verification
  console.log("✅ STEP 6: Verification...");
  
  const nftOwner = await positionManager.ownerOf(tokenId);
  console.log(`   🎨 NFT tokenId ${tokenId} owner: ${nftOwner}`);
  console.log(`   🔒 Timelock contract: ${timelockAddr}`);
  console.log(`   ✅ NFT is locked: ${nftOwner === timelockAddr ? 'YES' : 'NO'}`);
  console.log("");

  // Summary
  console.log("=" .repeat(80));
  console.log("🎉 OPZIONE B COMPLETED SUCCESSFULLY!");
  console.log("=" .repeat(80));
  console.log(`📍 Pool Address: ${poolAddr}`);
  console.log(`🎨 LP NFT TokenId: ${tokenId.toString()}`);
  console.log(`🔒 Timelock Contract: ${timelockAddr}`);
  console.log(`⏰ Unlock Date: ${new Date(unlockTime * 1000).toISOString()}`);
  console.log(`🔗 Check on BaseScan: https://sepolia.basescan.org/address/${timelockAddr}`);
  console.log(`🔗 Check NFT: https://sepolia.basescan.org/token/${POS_MANAGER}?a=${tokenId}`);
  console.log("=" .repeat(80));
}

// Helper function to calculate sqrtPriceX96
function calculateSqrtPriceX96(price: bigint): bigint {
  // This is a simplified calculation
  // In production, use proper price calculation based on token decimals
  const Q96 = 2n ** 96n;
  const sqrt = BigInt(Math.floor(Math.sqrt(Number(price))));
  return sqrt * Q96;
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
