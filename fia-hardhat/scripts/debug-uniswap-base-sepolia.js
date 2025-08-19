const hre = require("hardhat");

async function main() {
  console.log("🔍 Deep debugging Uniswap v3 on Base Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // Indirizzi da verificare
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  const FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  const WETH = "0x4200000000000000000000000000000000000006";
  
  console.log("\n📋 Checking contract existence...");
  
  // Check se i contratti esistono
  const posCode = await hre.ethers.provider.getCode(POS_MANAGER);
  const factoryCode = await hre.ethers.provider.getCode(FACTORY);
  const wethCode = await hre.ethers.provider.getCode(WETH);
  
  console.log(`   Position Manager (${POS_MANAGER}):`);
  console.log(`   Code length: ${posCode.length}`);
  console.log(`   Exists: ${posCode !== "0x" ? "✅" : "❌"}`);
  
  console.log(`\n   Factory (${FACTORY}):`);
  console.log(`   Code length: ${factoryCode.length}`);
  console.log(`   Exists: ${factoryCode !== "0x" ? "✅" : "❌"}`);
  
  console.log(`\n   WETH (${WETH}):`);
  console.log(`   Code length: ${wethCode.length}`);
  console.log(`   Exists: ${wethCode !== "0x" ? "✅" : "❌"}`);
  
  if (posCode === "0x") {
    console.log("\n❌ Position Manager doesn't exist! Checking official Base Sepolia docs...");
    return;
  }
  
  console.log("\n🔍 Checking Position Manager functions...");
  
  try {
    // Simple view call to check if contract works
    const factoryAddr = await hre.ethers.getContractAt("INonfungiblePositionManager", POS_MANAGER).factory();
    console.log(`   Factory from Position Manager: ${factoryAddr}`);
    
    if (factoryAddr.toLowerCase() !== FACTORY.toLowerCase()) {
      console.log(`   ⚠️  Factory mismatch! Expected: ${FACTORY}, Got: ${factoryAddr}`);
    } else {
      console.log("   ✅ Factory address matches");
    }
  } catch (error) {
    console.log(`   ❌ Error calling Position Manager: ${error.message}`);
  }
  
  console.log("\n🔍 Checking Factory functions...");
  
  try {
    const factoryABI = [
      "function owner() external view returns (address)",
      "function feeAmountTickSpacing(uint24 fee) external view returns (int24)",
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];
    
    const factory = new hre.ethers.Contract(FACTORY, factoryABI, deployer);
    
    const owner = await factory.owner();
    console.log(`   Factory owner: ${owner}`);
    
    const tickSpacing = await factory.feeAmountTickSpacing(3000);
    console.log(`   Tick spacing for 3000 fee: ${tickSpacing}`);
    
    console.log("   ✅ Factory responds to calls");
  } catch (error) {
    console.log(`   ❌ Error calling Factory: ${error.message}`);
  }
  
  console.log("\n🔍 Testing pool creation directly...");
  
  const FIA_ADDR = "0x21Fd5229c940eDEdf0286678A0b5E34e4b0281e4";
  
  try {
    const factoryABI = [
      "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
      "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];
    
    const factory = new hre.ethers.Contract(FACTORY, factoryABI, deployer);
    
    // Check if pool already exists
    const existingPool = await factory.getPool(FIA_ADDR, WETH, 3000);
    console.log(`   Existing pool: ${existingPool}`);
    
    if (existingPool === hre.ethers.ZeroAddress) {
      console.log("   Pool doesn't exist, trying to create...");
      
      // Try simulation first
      try {
        const data = factory.interface.encodeFunctionData("createPool", [FIA_ADDR, WETH, 3000]);
        const result = await hre.ethers.provider.call({
          to: FACTORY,
          data: data,
          from: deployer.address
        });
        console.log(`   ✅ Simulation successful, result: ${result}`);
        
        // If simulation works, try real transaction
        console.log("   📝 Attempting real pool creation...");
        const tx = await factory.createPool(FIA_ADDR, WETH, 3000, {
          gasLimit: 2000000,
          maxFeePerGas: hre.ethers.parseUnits("0.1", "gwei"),
          maxPriorityFeePerGas: hre.ethers.parseUnits("0.05", "gwei")
        });
        
        console.log(`   📝 Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Pool created! Block: ${receipt.blockNumber}`);
        
        // Get new pool address
        const newPool = await factory.getPool(FIA_ADDR, WETH, 3000);
        console.log(`   🎉 New pool address: ${newPool}`);
        
      } catch (simError) {
        console.log(`   ❌ Pool creation simulation failed: ${simError.message}`);
        
        // Check if it's a known error
        if (simError.message.includes("PoolAlreadyExists")) {
          console.log("   💡 Pool already exists but getPool returned zero address - weird!");
        } else if (simError.message.includes("IdenticalAddresses")) {
          console.log("   💡 Token addresses are identical");
        } else if (simError.message.includes("ZeroAddress")) {
          console.log("   💡 One of the addresses is zero");
        }
      }
    } else {
      console.log("   ✅ Pool already exists!");
    }
    
  } catch (error) {
    console.log(`   ❌ Pool creation test failed: ${error.message}`);
  }
  
  console.log("\n📋 Next steps:");
  console.log("   1. If contracts don't exist → find correct Base Sepolia addresses");
  console.log("   2. If pool creation fails → debug specific error");
  console.log("   3. If all works → proceed with mint");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
