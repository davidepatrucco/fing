const hre = require("hardhat");

async function main() {
  console.log("🔧 Adding Uniswap v3 fee exemptions to FIACoin...");
  
  const FIA_ADDR = process.env.FIA_ADDR;
  if (!FIA_ADDR) {
    throw new Error("❌ Set FIA_ADDR environment variable");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const FIA = await hre.ethers.getContractAt("FIACoin", FIA_ADDR);
  
  // Uniswap v3 addresses on Base Sepolia
  const POS_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";
  const FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  const ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // SwapRouter if exists
  
  console.log("\n📋 Adding fee exemptions for:");
  console.log(`   Position Manager: ${POS_MANAGER}`);
  console.log(`   Factory: ${FACTORY}`);
  
  const gasPrice = {
    maxFeePerGas: hre.ethers.parseUnits("0.01", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("0.005", "gwei")
  };

  // Add fee exemptions
  console.log("\n🔧 Setting fee exemptions...");
  
  const isExemptPos = await FIA.isFeeExempt(POS_MANAGER);
  if (!isExemptPos) {
    console.log("   📝 Exempting Position Manager...");
    const tx1 = await FIA.setFeeExempt(POS_MANAGER, true, gasPrice);
    await tx1.wait();
    console.log(`   ✅ Position Manager exempted: ${tx1.hash}`);
  } else {
    console.log("   ✅ Position Manager already exempted");
  }
  
  const isExemptFactory = await FIA.isFeeExempt(FACTORY);
  if (!isExemptFactory) {
    console.log("   📝 Exempting Factory...");
    const tx2 = await FIA.setFeeExempt(FACTORY, true, gasPrice);
    await tx2.wait();
    console.log(`   ✅ Factory exempted: ${tx2.hash}`);
  } else {
    console.log("   ✅ Factory already exempted");
  }
  
  console.log("\n✅ Fee exemptions completed!");
  console.log("Now try creating the pool again...");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
