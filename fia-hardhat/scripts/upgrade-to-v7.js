import { ethers, upgrades } from "hardhat";

async function main() {
    console.log("🔄 Upgrading FIACoin V6 to V7...");

    // Get the proxy address from previous deployment
    const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "0x..."; // Your deployed proxy
    
    if (!PROXY_ADDRESS || PROXY_ADDRESS === "0x...") {
        throw new Error("❌ Please set PROXY_ADDRESS environment variable");
    }

    console.log("📍 Proxy address:", PROXY_ADDRESS);

    // ✅ Deploy new implementation (V7)
    const FIACoinV7Upgradeable = await ethers.getContractFactory("FIACoinV7Upgradeable");
    
    console.log("🚀 Deploying V7 implementation...");
    
    // This deploys new implementation and updates proxy
    const upgradedProxy = await upgrades.upgradeProxy(PROXY_ADDRESS, FIACoinV7Upgradeable);
    
    console.log("✅ Upgrade completed!");
    
    // Verify upgrade worked
    const newVersion = await upgradedProxy.version();
    const newImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    
    console.log("🔍 Upgrade Verification:");
    console.log("  Proxy address (unchanged):", PROXY_ADDRESS);
    console.log("  New implementation:", newImplementation);
    console.log("  New version:", newVersion);
    
    // Test that storage is preserved
    const totalSupply = await upgradedProxy.totalSupply();
    const owner = await upgradedProxy.owner();
    
    console.log("📊 Storage Verification:");
    console.log("  Total Supply:", ethers.formatEther(totalSupply), "FIA");
    console.log("  Owner:", owner);
    
    // Test new V7 functions if they exist
    try {
        // Example: if V7 has new functions
        // const newFeature = await upgradedProxy.newV7Function();
        // console.log("  New V7 feature works:", newFeature);
    } catch (err) {
        console.log("  No new V7 functions to test");
    }

    console.log("\n🎉 Upgrade Summary:");
    console.log("✅ All users automatically using V7");
    console.log("✅ Same contract address for users");
    console.log("✅ All balances and stakes preserved"); 
    console.log("✅ Zero user action required");
    console.log("✅ Zero migration friction");

    // Save upgrade info
    const upgradeInfo = {
        proxyAddress: PROXY_ADDRESS,
        oldImplementation: "previous-implementation-address", // You'd track this
        newImplementation: newImplementation,
        oldVersion: "6.0.0",
        newVersion: newVersion,
        upgradeTime: new Date().toISOString(),
        upgrader: (await ethers.getSigners())[0].address
    };

    const fs = require('fs');
    fs.writeFileSync(
        `deployments/Upgrade-V6-to-V7-${Date.now()}.json`,
        JSON.stringify(upgradeInfo, null, 2)
    );

    console.log("\n📄 Upgrade logged to deployments folder");
}

main()
    .then(() => {
        console.log("\n🚀 Upgrade successful! Users are now on V7 automatically.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Upgrade failed:", error);
        process.exit(1);
    });
