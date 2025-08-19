import { ethers, upgrades } from "hardhat";

async function main() {
    console.log("🚀 Deploying FIACoin V6 with Proxy Pattern...");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Set deployment parameters
    const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
    const FOUNDER = process.env.FOUNDER_ADDRESS || deployer.address;
    const EXECUTOR = process.env.EXECUTOR_ADDRESS || deployer.address; // Gnosis Safe

    // ✅ Deploy using OpenZeppelin Upgrades Plugin
    const FIACoinV6Upgradeable = await ethers.getContractFactory("FIACoinV6Upgradeable");
    
    console.log("📦 Deploying proxy and implementation...");
    const fiaProxy = await upgrades.deployProxy(
        FIACoinV6Upgradeable,
        [TREASURY, FOUNDER, EXECUTOR],
        { 
            initializer: 'initialize',
            kind: 'uups' // UUPS Proxy pattern
        }
    );

    await fiaProxy.waitForDeployment();
    const proxyAddress = await fiaProxy.getAddress();

    console.log("✅ FIACoin V6 Proxy deployed to:", proxyAddress);
    
    // Get implementation address
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("📋 Implementation address:", implementationAddress);

    // Verify proxy works
    const version = await fiaProxy.version();
    const totalSupply = await fiaProxy.totalSupply();
    
    console.log("🔍 Verification:");
    console.log("  Version:", version);
    console.log("  Total Supply:", ethers.formatEther(totalSupply), "FIA");
    console.log("  Owner:", await fiaProxy.owner());
    console.log("  Treasury:", await fiaProxy.treasury());
    console.log("  Executor:", await fiaProxy.executor());

    // Save deployment info
    const deployment = {
        proxy: proxyAddress,
        implementation: implementationAddress,
        version: version,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        network: (await ethers.provider.getNetwork()).name
    };

    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deployment, null, 2));

    // Save to file for future reference
    const fs = require('fs');
    fs.writeFileSync(
        `deployments/FIACoinV6-${Date.now()}.json`, 
        JSON.stringify(deployment, null, 2)
    );

    console.log("\n🎯 Next Steps:");
    console.log("1. Verify implementation on Etherscan");
    console.log("2. Transfer ownership to Gnosis Safe if needed");
    console.log("3. Update frontend with proxy address:", proxyAddress);
    console.log("4. Test all functions work correctly");
    console.log("5. Prepare upgrade to V7 when needed with: npx hardhat run scripts/upgrade-to-v7.js");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
