const hre = require("hardhat");

async function main() {
  console.log("🔧 Temporarily disabling fees for pool creation...");
  
  const FIA_ADDR = process.env.FIA_ADDR;
  if (!FIA_ADDR) {
    throw new Error("❌ Set FIA_ADDR environment variable");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const FIA = await hre.ethers.getContractAt("FIACoin", FIA_ADDR);
  
  console.log("📋 Current fee settings:");
  const currentFee = await FIA.totalFeeBP();
  console.log(`   Total Fee BP: ${currentFee.toString()}`);
  
  if (currentFee > 0) {
    console.log("   🔧 Disabling fees temporarily...");
    
    const gasPrice = {
      maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
      maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei")
    };
    
    const tx = await FIA.setTotalFeeBP(0, gasPrice);
    await tx.wait();
    console.log(`   ✅ Fees disabled! Tx: ${tx.hash}`);
  } else {
    console.log("   ✅ Fees already disabled");
  }
  
  // Add Uniswap exemptions
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  const FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  
  console.log("\n🔧 Adding Uniswap exemptions...");
  
  const isExemptPos = await FIA.isFeeExempt(POS_MANAGER);
  if (!isExemptPos) {
    const tx1 = await FIA.setFeeExempt(POS_MANAGER, true, gasPrice);
    await tx1.wait();
    console.log(`   ✅ Position Manager exempted: ${tx1.hash}`);
  } else {
    console.log("   ✅ Position Manager already exempted");
  }
  
  const isExemptFactory = await FIA.isFeeExempt(FACTORY);
  if (!isExemptFactory) {
    const tx2 = await FIA.setFeeExempt(FACTORY, true, gasPrice);
    await tx2.wait();
    console.log(`   ✅ Factory exempted: ${tx2.hash}`);
  } else {
    console.log("   ✅ Factory already exempted");
  }
  
  console.log("\n✅ Setup completed! Now try pool creation:");
  console.log("   npx hardhat run scripts/create-pool.ts --network baseSepolia");
  console.log("\n⚠️  Remember to re-enable fees after pool creation:");
  console.log("   FIA.setTotalFeeBP(100) // Re-enable 1% fees");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
