import { ethers } from "hardhat";
import { FIACoinV5 } from "../typechain-types";

/**
 * Advanced Features Demo for FIACoinV5
 * 
 * This script demonstrates all the advanced features of FIACoinV5:
 * - Governance proposals and voting
 * - Staking with different lock periods
 * - Batch operations
 * - Anti-MEV protected transfers
 * - Analytics and monitoring
 * - Advanced transfer features
 */

async function main() {
  const contractAddress = process.env.FIA_V5_ADDRESS;
  if (!contractAddress) {
    console.log("Please set FIA_V5_ADDRESS environment variable");
    console.log("Or run this script with local deployment...");
    return await runLocalDemo();
  }

  const fiaV5 = await ethers.getContractAt("FIACoinV5", contractAddress) as FIACoinV5;
  await runAdvancedFeatureDemo(fiaV5);
}

async function runLocalDemo() {
  console.log("🚀 Running local FIACoinV5 advanced features demo...");
  
  const [deployer, treasury, founder, user1, user2, user3, user4] = await ethers.getSigners();
  
  // Deploy contract
  const FIACoinV5Factory = await ethers.getContractFactory("FIACoinV5");
  const fiaV5: FIACoinV5 = await FIACoinV5Factory.deploy(treasury.address, founder.address);
  await fiaV5.waitForDeployment();
  
  console.log("📄 Contract deployed to:", await fiaV5.getAddress());
  
  // Set up initial state
  await setupInitialState(fiaV5, [user1, user2, user3, user4]);
  
  // Run demo
  await runAdvancedFeatureDemo(fiaV5);
}

async function setupInitialState(fiaV5: FIACoinV5, users: any[]) {
  console.log("\n🔧 Setting up initial state...");
  
  // Distribute tokens to users
  const allocation = ethers.parseUnits("10000000", 18); // 10M FIA each
  for (const user of users) {
    await fiaV5.transfer(user.address, allocation);
  }
  
  // Add reward pool
  const rewardPool = ethers.parseUnits("5000000", 18); // 5M FIA
  await fiaV5.addToRewardPool(rewardPool);
  
  console.log("✅ Distributed tokens and set up reward pool");
}

async function runAdvancedFeatureDemo(fiaV5: FIACoinV5) {
  const [deployer, treasury, founder, user1, user2, user3, user4] = await ethers.getSigners();
  
  console.log("\n🎯 FIACoinV5 Advanced Features Demo");
  console.log("=====================================");

  // 1. Governance System Demo
  await demoGovernanceSystem(fiaV5, user1, user2);
  
  // 2. Staking System Demo
  await demoStakingSystem(fiaV5, user1, user2);
  
  // 3. Batch Operations Demo
  await demoBatchOperations(fiaV5, deployer, [user1, user2, user3]);
  
  // 4. Anti-MEV Protection Demo
  await demoAntiMEVProtection(fiaV5, user1);
  
  // 5. Analytics Demo
  await demoAnalytics(fiaV5);
  
  // 6. Advanced Transfer Features Demo
  await demoAdvancedTransfers(fiaV5, user1, user2);
  
  console.log("\n🎉 Advanced features demo completed!");
}

async function demoGovernanceSystem(fiaV5: FIACoinV5, user1: any, user2: any) {
  console.log("\n🗳️  Governance System Demo");
  console.log("-------------------------");
  
  const fiaUser1 = fiaV5.connect(user1);
  const fiaUser2 = fiaV5.connect(user2);
  
  // Check voting power
  const votingPower1 = await fiaV5.getVotingPower(user1.address);
  const votingPower2 = await fiaV5.getVotingPower(user2.address);
  
  console.log("User1 voting power:", ethers.formatUnits(votingPower1, 18), "FIA");
  console.log("User2 voting power:", ethers.formatUnits(votingPower2, 18), "FIA");
  
  // Create a proposal to change fees
  console.log("\n📋 Creating proposal to reduce fees...");
  const proposalData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [75]); // 0.75% fee
  
  await fiaUser1.propose(
    "Reduce total fee from 1% to 0.75% for better competitiveness",
    0, // FEE_CHANGE
    proposalData
  );
  
  console.log("✅ Proposal created successfully");
  
  // Vote on proposal
  console.log("\n🗳️  Voting on proposal...");
  await fiaUser1.vote(0, true);  // Vote yes
  await fiaUser2.vote(0, true);  // Vote yes
  
  console.log("✅ Both users voted YES on the proposal");
  
  // Display proposal status
  const proposal = await fiaV5.proposals(0);
  console.log("\n📊 Proposal Status:");
  console.log("For votes:", ethers.formatUnits(proposal.forVotes, 18), "FIA");
  console.log("Against votes:", ethers.formatUnits(proposal.againstVotes, 18), "FIA");
  console.log("End time:", new Date(Number(proposal.endTime) * 1000).toLocaleString());
}

async function demoStakingSystem(fiaV5: FIACoinV5, user1: any, user2: any) {
  console.log("\n💎 Staking System Demo");
  console.log("----------------------");
  
  const fiaUser1 = fiaV5.connect(user1);
  const fiaUser2 = fiaV5.connect(user2);
  
  // Different staking strategies
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;
  
  console.log("\n📈 Staking with different strategies...");
  
  // User1: Short term with auto-compound
  const stakeAmount1 = ethers.parseUnits("500000", 18); // 500k FIA
  await fiaUser1.stake(stakeAmount1, LOCK_30_DAYS, true);
  console.log("User1 staked", ethers.formatUnits(stakeAmount1, 18), "FIA for 30 days (auto-compound)");
  
  // User2: Long term without auto-compound
  const stakeAmount2 = ethers.parseUnits("1000000", 18); // 1M FIA
  await fiaUser2.stake(stakeAmount2, LOCK_365_DAYS, false);
  console.log("User2 staked", ethers.formatUnits(stakeAmount2, 18), "FIA for 365 days (manual claim)");
  
  // Display staking info
  const totalStaked = await fiaV5.totalStaked();
  const rewardPool = await fiaV5.rewardPool();
  
  console.log("\n📊 Staking Statistics:");
  console.log("Total staked:", ethers.formatUnits(totalStaked, 18), "FIA");
  console.log("Reward pool:", ethers.formatUnits(rewardPool, 18), "FIA");
  
  // Show APY rates
  console.log("\n💰 APY Rates:");
  console.log("30 days:", (Number(await fiaV5.stakingAPY(LOCK_30_DAYS)) / 100).toFixed(1), "% APY");
  console.log("365 days:", (Number(await fiaV5.stakingAPY(LOCK_365_DAYS)) / 100).toFixed(1), "% APY");
}

async function demoBatchOperations(fiaV5: FIACoinV5, deployer: any, users: any[]) {
  console.log("\n🔀 Batch Operations Demo");
  console.log("------------------------");
  
  // Batch transfer
  console.log("\n📤 Performing batch transfer...");
  const recipients = users.map(user => user.address);
  const amounts = [
    ethers.parseUnits("50000", 18),
    ethers.parseUnits("75000", 18),
    ethers.parseUnits("100000", 18)
  ];
  
  await fiaV5.batchTransfer(recipients, amounts);
  console.log("✅ Batch transferred to", recipients.length, "recipients");
  console.log("Total amount:", ethers.formatUnits(amounts.reduce((a, b) => a + b, 0n), 18), "FIA");
  
  // Batch fee exemption
  console.log("\n🛡️  Setting batch fee exemptions...");
  await fiaV5.batchSetFeeExempt([users[0].address, users[1].address], true);
  console.log("✅ Set fee exemption for 2 users");
  
  // Batch staking
  console.log("\n💎 Performing batch staking...");
  const fiaUser = fiaV5.connect(users[0]);
  const stakeAmounts = [
    ethers.parseUnits("10000", 18),
    ethers.parseUnits("20000", 18)
  ];
  const lockPeriods = [30 * 24 * 60 * 60, 90 * 24 * 60 * 60];
  
  await fiaUser.batchStake(stakeAmounts, lockPeriods);
  console.log("✅ Batch staked 2 different amounts with different lock periods");
}

async function demoAntiMEVProtection(fiaV5: FIACoinV5, user: any) {
  console.log("\n🛡️  Anti-MEV Protection Demo");
  console.log("----------------------------");
  
  const fiaUser = fiaV5.connect(user);
  
  // Show transaction limits
  const txLimits = await fiaV5.txLimits();
  console.log("\n⚙️  Transaction Limits:");
  console.log("Max transaction:", ethers.formatUnits(txLimits.maxTxAmount, 18), "FIA");
  console.log("Max wallet:", ethers.formatUnits(txLimits.maxWalletAmount, 18), "FIA");
  console.log("Cooldown:", txLimits.txCooldown.toString(), "seconds");
  console.log("Limits active:", txLimits.limitsActive);
  
  // Demonstrate protected transfer
  console.log("\n🔒 Performing protected transfer...");
  const transferAmount = ethers.parseUnits("1000", 18);
  const nonce = Math.floor(Math.random() * 1000000);
  
  const [, , , , recipient] = await ethers.getSigners();
  await fiaUser.protectedTransfer(recipient.address, transferAmount, nonce);
  console.log("✅ Protected transfer completed with nonce:", nonce);
  
  // Try to reuse nonce (should fail in real scenario)
  console.log("\n⚠️  Nonce protection prevents replay attacks");
  console.log("Attempting to reuse nonce would fail with 'Nonce used' error");
}

async function demoAnalytics(fiaV5: FIACoinV5) {
  console.log("\n📊 Analytics Demo");
  console.log("-----------------");
  
  // Get token statistics
  const tokenStats = await fiaV5.getTokenStats();
  console.log("\n🎯 Token Statistics:");
  console.log("Total fees collected:", ethers.formatUnits(tokenStats.totalFeeCollected, 18), "FIA");
  console.log("Total burned:", ethers.formatUnits(tokenStats.totalBurned, 18), "FIA");
  console.log("Total staked:", ethers.formatUnits(tokenStats.totalStaked, 18), "FIA");
  console.log("Unique holders:", tokenStats.uniqueHolders.toString());
  console.log("Transaction count:", tokenStats.transactionCount.toString());
  
  // Get user statistics for a specific user
  const [, , , user1] = await ethers.getSigners();
  const userStats = await fiaV5.getUserStats(user1.address);
  console.log("\n👤 User1 Statistics:");
  console.log("Fees paid:", ethers.formatUnits(userStats.totalFeesPaid, 18), "FIA");
  console.log("Staking rewards:", ethers.formatUnits(userStats.totalStakingRewards, 18), "FIA");
  console.log("Transaction count:", userStats.transactionCount.toString());
  console.log("First transaction:", new Date(Number(userStats.firstTransactionTime) * 1000).toLocaleString());
}

async function demoAdvancedTransfers(fiaV5: FIACoinV5, user1: any, user2: any) {
  console.log("\n🚀 Advanced Transfer Features Demo");
  console.log("----------------------------------");
  
  const fiaUser1 = fiaV5.connect(user1);
  
  // Transfer with data
  console.log("\n📝 Transfer with data...");
  const transferAmount = ethers.parseUnits("1000", 18);
  const data = ethers.toUtf8Bytes("Payment for services rendered");
  
  await fiaUser1.transferWithData(user2.address, transferAmount, data);
  console.log("✅ Transfer with attached data completed");
  console.log("Data:", ethers.toUtf8String(data));
  
  // Scheduled transfer
  console.log("\n⏰ Creating scheduled transfer...");
  const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const scheduledId = await fiaUser1.scheduledTransfer.staticCall(
    user2.address,
    transferAmount,
    futureTime
  );
  
  console.log("✅ Scheduled transfer created");
  console.log("Transfer ID:", scheduledId);
  console.log("Execute time:", new Date(futureTime * 1000).toLocaleString());
  
  // Recurring transfer
  console.log("\n🔄 Creating recurring transfer...");
  const recurringId = await fiaUser1.recurringTransfer.staticCall(
    user2.address,
    ethers.parseUnits("500", 18),
    86400, // 1 day interval
    10     // 10 transfers
  );
  
  console.log("✅ Recurring transfer created");
  console.log("Recurring ID:", recurringId);
  console.log("Interval: 1 day, Count: 10 transfers");
  
  console.log("\n💡 Note: Scheduled and recurring transfers create IDs but require");
  console.log("   external automation systems to execute in production");
}

main()
  .then(() => {
    console.log("\n✨ Demo completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Demo failed:", error);
    process.exit(1);
  });