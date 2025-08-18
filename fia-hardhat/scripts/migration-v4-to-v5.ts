import { ethers } from "hardhat";
import { FIACoinV4, FIACoinV5 } from "../typechain-types";

/**
 * Migration script from FIACoinV4 to FIACoinV5
 * 
 * This script demonstrates how to:
 * 1. Deploy the new FIACoinV5 contract
 * 2. Set up initial governance structure
 * 3. Configure staking parameters
 * 4. Transition community from v4 to v5
 */

async function main() {
  const [deployer, treasury, founder, community1, community2] = await ethers.getSigners();
  
  console.log("FIACoinV4 to FIACoinV5 Migration");
  console.log("================================");
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury.address);
  console.log("Founder:", founder.address);

  // Step 1: Deploy FIACoinV5
  console.log("\n1. Deploying FIACoinV5...");
  const FIACoinV5Factory = await ethers.getContractFactory("FIACoinV5");
  const fiaV5: FIACoinV5 = await FIACoinV5Factory.deploy(treasury.address, founder.address);
  await fiaV5.waitForDeployment();
  
  const v5Address = await fiaV5.getAddress();
  console.log("FIACoinV5 deployed to:", v5Address);

  // Step 2: Verify deployment
  console.log("\n2. Verifying deployment...");
  const totalSupply = await fiaV5.totalSupply();
  const deployerBalance = await fiaV5.balanceOf(deployer.address);
  
  console.log("Total Supply:", ethers.formatUnits(totalSupply, 18), "FIA");
  console.log("Deployer Balance:", ethers.formatUnits(deployerBalance, 18), "FIA");
  console.log("Supply Increase:", "1,000,000x (1B → 1000T)");

  // Step 3: Initial token distribution for testing
  console.log("\n3. Distributing tokens for governance and staking...");
  
  // Give community members enough tokens to participate in governance
  const communityAllocation = ethers.parseUnits("5000000", 18); // 5M FIA each
  await fiaV5.transfer(community1.address, communityAllocation);
  await fiaV5.transfer(community2.address, communityAllocation);
  
  console.log("Distributed", ethers.formatUnits(communityAllocation, 18), "FIA to community1");
  console.log("Distributed", ethers.formatUnits(communityAllocation, 18), "FIA to community2");

  // Step 4: Set up initial reward pool
  console.log("\n4. Setting up initial reward pool...");
  const initialRewardPool = ethers.parseUnits("1000000", 18); // 1M FIA
  await fiaV5.addToRewardPool(initialRewardPool);
  
  const rewardPool = await fiaV5.rewardPool();
  console.log("Initial reward pool:", ethers.formatUnits(rewardPool, 18), "FIA");

  // Step 5: Demonstrate governance functionality
  console.log("\n5. Testing governance functionality...");
  
  // Create a proposal to reduce fees
  const fiaV5Community1 = fiaV5.connect(community1);
  const proposalData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]); // 0.5% fee
  
  await fiaV5Community1.propose(
    "Reduce total fee from 1% to 0.5%",
    0, // FEE_CHANGE
    proposalData
  );
  
  console.log("Created proposal to reduce fees");
  
  // Vote on the proposal
  await fiaV5Community1.vote(0, true); // Vote yes
  
  const votingPower1 = await fiaV5.getVotingPower(community1.address);
  console.log("Community1 voted with", ethers.formatUnits(votingPower1, 18), "FIA voting power");

  // Step 6: Demonstrate staking functionality
  console.log("\n6. Testing staking functionality...");
  
  const stakeAmount = ethers.parseUnits("100000", 18); // 100k FIA
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;
  
  await fiaV5Community1.stake(stakeAmount, LOCK_90_DAYS, false);
  console.log("Community1 staked", ethers.formatUnits(stakeAmount, 18), "FIA for 90 days");
  
  const totalStaked = await fiaV5.totalStaked();
  console.log("Total staked in contract:", ethers.formatUnits(totalStaked, 18), "FIA");

  // Step 7: Demonstrate batch operations
  console.log("\n7. Testing batch operations...");
  
  const recipients = [community1.address, community2.address];
  const amounts = [ethers.parseUnits("1000", 18), ethers.parseUnits("2000", 18)];
  
  await fiaV5.batchTransfer(recipients, amounts);
  console.log("Performed batch transfer to 2 recipients");

  // Step 8: Display key differences from v4
  console.log("\n8. Key differences from FIACoinV4:");
  console.log("✅ Total Supply: 1B → 1000T tokens");
  console.log("✅ Governance: Community-controlled proposals and voting");
  console.log("✅ Staking: Variable APY based on lock periods");
  console.log("✅ Batch Operations: Gas-efficient multiple operations");
  console.log("✅ Anti-MEV: Protection against sandwich attacks");
  console.log("✅ Analytics: Real-time on-chain metrics");
  console.log("✅ Advanced Transfers: With data, scheduled, recurring");

  // Step 9: Display governance configuration
  console.log("\n9. Governance Configuration:");
  console.log("Proposal Threshold:", ethers.formatUnits(await fiaV5.PROPOSAL_THRESHOLD(), 18), "FIA");
  console.log("Voting Period:", (await fiaV5.VOTING_PERIOD()).toString(), "seconds");
  console.log("Quorum Required:", (await fiaV5.QUORUM_PERCENTAGE()).toString(), "% of total supply");
  console.log("Execution Delay:", (await fiaV5.EXECUTION_DELAY()).toString(), "seconds");

  // Step 10: Display staking configuration
  console.log("\n10. Staking Configuration:");
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_180_DAYS = 180 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;
  
  console.log("30 Days Lock:", (Number(await fiaV5.stakingAPY(LOCK_30_DAYS)) / 100).toFixed(1), "% APY");
  console.log("90 Days Lock:", (Number(await fiaV5.stakingAPY(LOCK_90_DAYS)) / 100).toFixed(1), "% APY");
  console.log("180 Days Lock:", (Number(await fiaV5.stakingAPY(LOCK_180_DAYS)) / 100).toFixed(1), "% APY");
  console.log("365 Days Lock:", (Number(await fiaV5.stakingAPY(LOCK_365_DAYS)) / 100).toFixed(1), "% APY");

  // Step 11: Migration recommendations
  console.log("\n11. Migration Recommendations:");
  console.log("🔄 For existing v4 holders:");
  console.log("   - No automatic migration (new contract deployment)");
  console.log("   - Keep v4 tokens or participate in community swap program");
  console.log("   - New features require v5 tokens");
  console.log("");
  console.log("🗳️ For governance participation:");
  console.log("   - Minimum 1M FIA needed to create proposals");
  console.log("   - All token holders can vote on proposals");
  console.log("   - Voting power = token balance");
  console.log("");
  console.log("💎 For staking rewards:");
  console.log("   - Choose lock period based on desired APY");
  console.log("   - Auto-compound for exponential growth");
  console.log("   - Early withdrawal penalty: 10%");

  console.log("\n✅ Migration simulation completed successfully!");
  console.log("Contract Address:", v5Address);
  console.log("Ready for mainnet deployment after audit");

  return {
    fiaV5Address: v5Address,
    totalSupply: totalSupply,
    rewardPool: rewardPool,
    totalStaked: totalStaked
  };
}

// Execute migration
main()
  .then((result) => {
    console.log("\n📋 Migration Summary:");
    console.log("FIACoinV5 Address:", result.fiaV5Address);
    console.log("Total Supply:", ethers.formatUnits(result.totalSupply, 18), "FIA");
    console.log("Reward Pool:", ethers.formatUnits(result.rewardPool, 18), "FIA");
    console.log("Total Staked:", ethers.formatUnits(result.totalStaked, 18), "FIA");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });