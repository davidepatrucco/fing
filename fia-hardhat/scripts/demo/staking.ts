import { ethers } from "hardhat";
import { FIACoinV5 } from "../typechain-types";

// Staking utility functions for FIACoinV5

async function main() {
  const contractAddress = process.env.FIA_V5_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set FIA_V5_ADDRESS environment variable");
  }

  const [deployer] = await ethers.getSigners();
  const fiaV5 = await ethers.getContractAt("FIACoinV5", contractAddress) as FIACoinV5;

  console.log("FIACoinV5 Staking Dashboard");
  console.log("Contract Address:", contractAddress);
  console.log("User Address:", deployer.address);
  console.log("=====================================");

  // Display current staking status
  await displayStakingStatus(fiaV5, deployer.address);

  // Check if we have command line arguments for actions
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\nAvailable commands:");
    console.log("- npm run staking:stake <amount> <lockPeriod> <autoCompound>");
    console.log("- npm run staking:unstake <stakeIndex>");
    console.log("- npm run staking:claim-rewards <stakeIndex>");
    console.log("- npm run staking:status");
    console.log("- npm run staking:add-rewards <amount>");
    console.log("\nLock periods: 30, 90, 180, 365 (days)");
    console.log("AutoCompound: true/false");
    return;
  }

  const command = args[0];

  switch (command) {
    case "stake":
      await stakeTokens(fiaV5, args[1], parseInt(args[2]), args[3] === "true");
      break;
    case "unstake":
      await unstakeTokens(fiaV5, parseInt(args[1]));
      break;
    case "claim-rewards":
      await claimRewards(fiaV5, parseInt(args[1]));
      break;
    case "status":
      await displayStakingStatus(fiaV5, deployer.address);
      break;
    case "add-rewards":
      await addRewards(fiaV5, args[1]);
      break;
    default:
      console.log("Unknown command:", command);
  }
}

async function displayStakingStatus(fiaV5: FIACoinV5, userAddress: string) {
  console.log("\n=== Global Staking Status ===");
  
  const totalStaked = await fiaV5.totalStaked();
  const rewardPool = await fiaV5.rewardPool();
  const totalSupply = await fiaV5.totalSupply();
  
  console.log("Total Staked:", ethers.formatUnits(totalStaked, 18), "FIA");
  console.log("Reward Pool:", ethers.formatUnits(rewardPool, 18), "FIA");
  console.log("Staking Ratio:", ((Number(totalStaked) / Number(totalSupply)) * 100).toFixed(2), "%");

  // Display APY rates
  console.log("\n=== Staking APY Rates ===");
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;
  const LOCK_180_DAYS = 180 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;

  const apy30 = await fiaV5.stakingAPY(LOCK_30_DAYS);
  const apy90 = await fiaV5.stakingAPY(LOCK_90_DAYS);
  const apy180 = await fiaV5.stakingAPY(LOCK_180_DAYS);
  const apy365 = await fiaV5.stakingAPY(LOCK_365_DAYS);

  console.log("30 Days:", (Number(apy30) / 100).toFixed(1), "% APY");
  console.log("90 Days:", (Number(apy90) / 100).toFixed(1), "% APY");
  console.log("180 Days:", (Number(apy180) / 100).toFixed(1), "% APY");
  console.log("365 Days:", (Number(apy365) / 100).toFixed(1), "% APY");

  // Display user's staking status
  console.log("\n=== Your Staking Status ===");
  const userBalance = await fiaV5.balanceOf(userAddress);
  console.log("Available Balance:", ethers.formatUnits(userBalance, 18), "FIA");

  const totalRewards = await fiaV5.getStakingRewards(userAddress);
  console.log("Pending Rewards:", ethers.formatUnits(totalRewards, 18), "FIA");

  // Get user stakes (we'll check the first 10 stakes)
  console.log("\n=== Your Stakes ===");
  let stakeCount = 0;
  let totalUserStaked = 0n;

  for (let i = 0; i < 10; i++) {
    try {
      const stake = await fiaV5.userStakes(userAddress, i);
      if (stake.amount > 0) {
        stakeCount++;
        totalUserStaked += stake.amount;
        
        console.log(`\nStake ${i}:`);
        console.log("  Amount:", ethers.formatUnits(stake.amount, 18), "FIA");
        console.log("  Staking Time:", new Date(Number(stake.stakingTime) * 1000).toLocaleString());
        console.log("  Lock Period:", Number(stake.lockPeriod) / (24 * 60 * 60), "days");
        console.log("  Auto Compound:", stake.autoCompound);
        console.log("  Last Reward Claim:", new Date(Number(stake.lastRewardClaim) * 1000).toLocaleString());
        
        // Calculate individual stake rewards
        const stakeRewards = await calculateStakeRewards(fiaV5, userAddress, i, stake);
        console.log("  Pending Rewards:", ethers.formatUnits(stakeRewards, 18), "FIA");
        
        // Check if lock period is over
        const now = Math.floor(Date.now() / 1000);
        const unlockTime = Number(stake.stakingTime) + Number(stake.lockPeriod);
        const isLocked = now < unlockTime;
        console.log("  Status:", isLocked ? "Locked" : "Unlocked");
        
        if (isLocked) {
          console.log("  Unlock Time:", new Date(unlockTime * 1000).toLocaleString());
        }
      }
    } catch (error) {
      // No more stakes
      break;
    }
  }

  if (stakeCount === 0) {
    console.log("No active stakes found.");
  } else {
    console.log(`\nTotal: ${stakeCount} stakes, ${ethers.formatUnits(totalUserStaked, 18)} FIA staked`);
  }
}

async function calculateStakeRewards(fiaV5: FIACoinV5, userAddress: string, stakeIndex: number, stake: any): Promise<bigint> {
  // This is a simplified calculation - the actual contract calculation might differ
  const stakingDuration = BigInt(Math.floor(Date.now() / 1000)) - stake.lastRewardClaim;
  const apy = await fiaV5.stakingAPY(stake.lockPeriod);
  
  // Annual reward = amount * apy / 10000
  // Reward for duration = annual reward * duration / (365 * 24 * 60 * 60)
  const reward = (stake.amount * apy * stakingDuration) / (365n * 24n * 60n * 60n * 10000n);
  
  return reward;
}

async function stakeTokens(fiaV5: FIACoinV5, amountStr: string, lockDays: number, autoCompound: boolean) {
  console.log("\n=== Staking Tokens ===");
  console.log("Amount:", amountStr, "FIA");
  console.log("Lock Period:", lockDays, "days");
  console.log("Auto Compound:", autoCompound);

  const amount = ethers.parseUnits(amountStr, 18);
  const lockPeriod = lockDays * 24 * 60 * 60; // Convert days to seconds

  // Validate lock period
  const validLockPeriods = [30, 90, 180, 365];
  if (!validLockPeriods.includes(lockDays)) {
    console.log("Error: Invalid lock period. Must be 30, 90, 180, or 365 days");
    return;
  }

  const [deployer] = await ethers.getSigners();
  const balance = await fiaV5.balanceOf(deployer.address);

  if (balance < amount) {
    console.log("Error: Insufficient balance");
    console.log("Required:", ethers.formatUnits(amount, 18), "FIA");
    console.log("Available:", ethers.formatUnits(balance, 18), "FIA");
    return;
  }

  try {
    console.log("Submitting staking transaction...");
    const tx = await fiaV5.stake(amount, lockPeriod, autoCompound);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt?.gasUsed.toString());
    
    // Get stake index from event
    const events = receipt?.logs.map(log => {
      try {
        return fiaV5.interface.parseLog(log as any);
      } catch {
        return null;
      }
    }).filter(event => event?.name === 'Staked');
    
    if (events && events.length > 0) {
      console.log("Stake Index:", events[0]?.args[3].toString());
      console.log("Your tokens are now staked!");
    }
  } catch (error) {
    console.error("Failed to stake tokens:", error);
  }
}

async function unstakeTokens(fiaV5: FIACoinV5, stakeIndex: number) {
  console.log("\n=== Unstaking Tokens ===");
  console.log("Stake Index:", stakeIndex);

  const [deployer] = await ethers.getSigners();

  try {
    // Get stake info
    const stake = await fiaV5.userStakes(deployer.address, stakeIndex);
    
    if (stake.amount === 0n) {
      console.log("Error: No active stake found at index", stakeIndex);
      return;
    }

    console.log("Stake Amount:", ethers.formatUnits(stake.amount, 18), "FIA");
    console.log("Staking Time:", new Date(Number(stake.stakingTime) * 1000).toLocaleString());
    console.log("Lock Period:", Number(stake.lockPeriod) / (24 * 60 * 60), "days");

    // Check if early withdrawal
    const now = Math.floor(Date.now() / 1000);
    const unlockTime = Number(stake.stakingTime) + Number(stake.lockPeriod);
    const isEarlyWithdrawal = now < unlockTime;

    if (isEarlyWithdrawal) {
      console.log("⚠️  WARNING: Early withdrawal detected!");
      console.log("Unlock time:", new Date(unlockTime * 1000).toLocaleString());
      console.log("Early withdrawal penalty: 10% of staked amount");
      
      const penalty = stake.amount * 10n / 100n;
      const finalAmount = stake.amount - penalty;
      console.log("Amount after penalty:", ethers.formatUnits(finalAmount, 18), "FIA");
      
      // Ask for confirmation (in a real app, you'd implement proper confirmation)
      console.log("Proceeding with early withdrawal...");
    }

    const tx = await fiaV5.unstake(stakeIndex);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt?.gasUsed.toString());
    console.log("Tokens unstaked successfully!");
  } catch (error) {
    console.error("Failed to unstake tokens:", error);
  }
}

async function claimRewards(fiaV5: FIACoinV5, stakeIndex: number) {
  console.log("\n=== Claiming Rewards ===");
  console.log("Stake Index:", stakeIndex);

  const [deployer] = await ethers.getSigners();

  try {
    // Get stake info
    const stake = await fiaV5.userStakes(deployer.address, stakeIndex);
    
    if (stake.amount === 0n) {
      console.log("Error: No active stake found at index", stakeIndex);
      return;
    }

    // Calculate expected rewards
    const expectedRewards = await calculateStakeRewards(fiaV5, deployer.address, stakeIndex, stake);
    console.log("Expected Rewards:", ethers.formatUnits(expectedRewards, 18), "FIA");

    if (expectedRewards === 0n) {
      console.log("No rewards available to claim at this time.");
      return;
    }

    const tx = await fiaV5.claimRewards(stakeIndex);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt?.gasUsed.toString());
    
    // Get reward amount from event
    const events = receipt?.logs.map(log => {
      try {
        return fiaV5.interface.parseLog(log as any);
      } catch {
        return null;
      }
    }).filter(event => event?.name === 'RewardClaimed');
    
    if (events && events.length > 0) {
      const claimedAmount = events[0]?.args[1];
      console.log("Rewards claimed:", ethers.formatUnits(claimedAmount, 18), "FIA");
    }
    
    console.log("Rewards claimed successfully!");
  } catch (error) {
    console.error("Failed to claim rewards:", error);
  }
}

async function addRewards(fiaV5: FIACoinV5, amountStr: string) {
  console.log("\n=== Adding Rewards to Pool ===");
  console.log("Amount:", amountStr, "FIA");

  const amount = ethers.parseUnits(amountStr, 18);
  const [deployer] = await ethers.getSigners();
  const balance = await fiaV5.balanceOf(deployer.address);

  if (balance < amount) {
    console.log("Error: Insufficient balance");
    console.log("Required:", ethers.formatUnits(amount, 18), "FIA");
    console.log("Available:", ethers.formatUnits(balance, 18), "FIA");
    return;
  }

  try {
    const tx = await fiaV5.addToRewardPool(amount);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Gas used:", receipt?.gasUsed.toString());
    console.log("Rewards added to pool successfully!");
    
    const newRewardPool = await fiaV5.rewardPool();
    console.log("New reward pool balance:", ethers.formatUnits(newRewardPool, 18), "FIA");
  } catch (error) {
    console.error("Failed to add rewards:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });