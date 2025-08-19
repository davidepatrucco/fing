import { ethers } from "hardhat";
import { FIACoinV5 } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying FIACoinV5 with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get constructor parameters
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const founderAddress = process.env.FOUNDER_ADDRESS || deployer.address;

  console.log("Treasury address:", treasuryAddress);
  console.log("Founder address:", founderAddress);

  // Deploy the contract
  const FIACoinV5Factory = await ethers.getContractFactory("FIACoinV5");
  
  console.log("Deploying FIACoinV5...");
  const fiaV5: FIACoinV5 = await FIACoinV5Factory.deploy(treasuryAddress, founderAddress);
  
  await fiaV5.waitForDeployment();
  const contractAddress = await fiaV5.getAddress();

  console.log("FIACoinV5 deployed to:", contractAddress);

  // Verify deployment
  const totalSupply = await fiaV5.totalSupply();
  const deployerBalance = await fiaV5.balanceOf(deployer.address);
  const name = await fiaV5.name();
  const symbol = await fiaV5.symbol();

  console.log("\n=== Deployment Verification ===");
  console.log("Contract Name:", name);
  console.log("Contract Symbol:", symbol);
  console.log("Total Supply:", ethers.formatUnits(totalSupply, 18), "FIA");
  console.log("Deployer Balance:", ethers.formatUnits(deployerBalance, 18), "FIA");
  console.log("Treasury:", await fiaV5.treasury());
  console.log("Founder:", await fiaV5.founderWallet());

  // Check staking configuration
  console.log("\n=== Staking Configuration ===");
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;
  const LOCK_180_DAYS = 180 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;

  console.log("30 Days APY:", (await fiaV5.stakingAPY(LOCK_30_DAYS)).toString(), "basis points");
  console.log("90 Days APY:", (await fiaV5.stakingAPY(LOCK_90_DAYS)).toString(), "basis points");
  console.log("180 Days APY:", (await fiaV5.stakingAPY(LOCK_180_DAYS)).toString(), "basis points");
  console.log("365 Days APY:", (await fiaV5.stakingAPY(LOCK_365_DAYS)).toString(), "basis points");

  // Check transaction limits
  console.log("\n=== Transaction Limits ===");
  const txLimits = await fiaV5.txLimits();
  console.log("Max Transaction Amount:", ethers.formatUnits(txLimits.maxTxAmount, 18), "FIA");
  console.log("Max Wallet Amount:", ethers.formatUnits(txLimits.maxWalletAmount, 18), "FIA");
  console.log("Transaction Cooldown:", txLimits.txCooldown.toString(), "seconds");
  console.log("Limits Active:", txLimits.limitsActive);

  // Check governance constants
  console.log("\n=== Governance Configuration ===");
  console.log("Proposal Threshold:", ethers.formatUnits(await fiaV5.PROPOSAL_THRESHOLD(), 18), "FIA");
  console.log("Voting Period:", (await fiaV5.VOTING_PERIOD()).toString(), "seconds");
  console.log("Quorum Percentage:", (await fiaV5.QUORUM_PERCENTAGE()).toString(), "%");
  console.log("Execution Delay:", (await fiaV5.EXECUTION_DELAY()).toString(), "seconds");

  // Check fee configuration
  console.log("\n=== Fee Configuration ===");
  console.log("Total Fee BP:", (await fiaV5.totalFeeBP()).toString());
  console.log("Treasury Fee BP:", (await fiaV5.feeToTreasuryBP()).toString());
  console.log("Founder Fee BP:", (await fiaV5.feeToFounderBP()).toString());
  console.log("Burn Fee BP:", (await fiaV5.feeToBurnBP()).toString());

  console.log("\n=== Deployment Complete ===");
  console.log("Contract Address:", contractAddress);
  console.log("Block Number:", await ethers.provider.getBlockNumber());
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Add some initial funds to reward pool if deployer wants to
  if (process.env.INITIAL_REWARD_POOL) {
    const rewardAmount = ethers.parseUnits(process.env.INITIAL_REWARD_POOL, 18);
    console.log("\nAdding initial reward pool...");
    const tx = await fiaV5.addToRewardPool(rewardAmount);
    await tx.wait();
    console.log("Added", ethers.formatUnits(rewardAmount, 18), "FIA to reward pool");
  }

  return {
    contract: fiaV5,
    address: contractAddress,
    deployer: deployer.address,
    treasury: treasuryAddress,
    founder: founderAddress
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\nDeployment successful!");
    console.log("Save this information:");
    console.log("Contract Address:", result.address);
    console.log("Deployer:", result.deployer);
    console.log("Treasury:", result.treasury);
    console.log("Founder:", result.founder);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });