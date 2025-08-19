const hre = require("hardhat");

async function main() {
  console.log("🔍 Testing pool creation with proper ABIs...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const FIA_ADDR = "0x21Fd5229c940eDEdf0286678A0b5E34e4b0281e4";
  const WETH = "0x4200000000000000000000000000000000000006";
  const FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  const fee = 3000;
  
  console.log("\n📋 Configuration:");
  console.log(`   FIA: ${FIA_ADDR}`);
  console.log(`   WETH: ${WETH}`);
  console.log(`   Factory: ${FACTORY}`);
  console.log(`   Fee: ${fee}`);
  
  // Factory ABI minimo
  const factoryABI = [
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    "function owner() external view returns (address)"
  ];
  
  const factory = new hre.ethers.Contract(FACTORY, factoryABI, deployer);
  
  console.log("\n🔍 Checking factory...");
  try {
    const owner = await factory.owner();
    console.log(`   ✅ Factory owner: ${owner}`);
  } catch (e) {
    console.log(`   ❌ Factory not responding: ${e.message}`);
    return;
  }
  
  console.log("\n🔍 Checking existing pool...");
  try {
    const existingPool = await factory.getPool(FIA_ADDR, WETH, fee);
    console.log(`   Existing pool: ${existingPool}`);
    
    if (existingPool !== hre.ethers.ZeroAddress) {
      console.log("   ✅ Pool already exists!");
      return;
    }
  } catch (e) {
    console.log(`   ❌ Error checking pool: ${e.message}`);
  }
  
  console.log("\n🧪 Testing pool creation simulation...");
  
  // Test call statico prima
  try {
    const data = factory.interface.encodeFunctionData("createPool", [FIA_ADDR, WETH, fee]);
    
    const result = await hre.ethers.provider.call({
      to: FACTORY,
      data: data,
      from: deployer.address
    });
    
    console.log(`   ✅ Static call successful`);
    console.log(`   Result: ${result}`);
    
    // Decode il risultato se possibile
    try {
      const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(["address"], result);
      console.log(`   Decoded pool address: ${decoded[0]}`);
    } catch (e) {
      console.log(`   Could not decode result: ${e.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Static call failed: ${error.message}`);
    
    // Analizza l'errore specifico
    if (error.message.includes("PA")) {
      console.log("   💡 Error code 'PA' might mean 'Pool Already exists'");
    } else if (error.message.includes("IT")) {
      console.log("   💡 Error code 'IT' might mean 'Identical Tokens'");
    } else if (error.message.includes("revert")) {
      console.log("   💡 Transaction would revert - check token addresses and fee");
    }
    
    return;
  }
  
  console.log("\n🚀 Static call worked! Attempting real transaction...");
  
  try {
    // Gas settings più conservativi
    const gasSettings = {
      gasLimit: 3000000,
      maxFeePerGas: hre.ethers.parseUnits("0.02", "gwei"),
      maxPriorityFeePerGas: hre.ethers.parseUnits("0.01", "gwei")
    };
    
    console.log("   📝 Sending createPool transaction...");
    const tx = await factory.createPool(FIA_ADDR, WETH, fee, gasSettings);
    
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`   ✅ Pool created successfully! Block: ${receipt.blockNumber}`);
      
      // Verifica la nuova pool
      const newPool = await factory.getPool(FIA_ADDR, WETH, fee);
      console.log(`   🎉 New pool address: ${newPool}`);
      
      console.log("\n🎯 SUCCESS! Now you can proceed with mint:");
      console.log(`   FIA_ADDR=${FIA_ADDR} npx hardhat run scripts/opzione-b-final.js --network baseSepolia`);
      
    } else {
      console.log(`   ❌ Transaction failed with status: ${receipt.status}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Real transaction failed: ${error.message}`);
    
    if (error.message.includes("replacement transaction underpriced")) {
      console.log("   💡 Try increasing gas price or waiting a few minutes");
    }
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
