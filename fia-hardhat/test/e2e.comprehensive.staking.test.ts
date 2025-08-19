import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Comprehensive Staking Testing', function () {
  let fiaFactory: any;
  let deployer: any, treasury: any, founder: any;
  let users: any[];
  
  // Lock periods in seconds
  const LOCK_30_DAYS = 30 * 24 * 60 * 60;
  const LOCK_90_DAYS = 90 * 24 * 60 * 60;
  const LOCK_180_DAYS = 180 * 24 * 60 * 60;
  const LOCK_365_DAYS = 365 * 24 * 60 * 60;
  
  const lockPeriods = [LOCK_30_DAYS, LOCK_90_DAYS, LOCK_180_DAYS, LOCK_365_DAYS];
  const lockPeriodNames = ['30 days', '90 days', '180 days', '365 days'];
  
  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [deployer, treasury, founder, ...users] = signers;
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  async function deployAndSetupContract() {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);
    
    // Add significant reward pool
    await fia.addToRewardPool(ethers.parseUnits('1000000', 18));
    
    return fia;
  }

  async function fundUser(fia: any, user: any, amount: string) {
    await fia.transfer(user.address, ethers.parseUnits(amount, 18));
  }

  describe('Single Lock Period Testing', function () {
    lockPeriods.forEach((lockPeriod, index) => {
      const periodName = lockPeriodNames[index];
      
      describe(`${periodName} lock period`, function () {
        it(`should allow staking with ${periodName} lock without auto-compound`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          // Stake without auto-compound
          await expect(userFia.stake(stakeAmount, lockPeriod, false))
            .to.emit(fia, 'Staked')
            .withArgs(user.address, stakeAmount, lockPeriod, 0);
          
          // Verify stake info
          const stakeInfo = await fia.userStakes(user.address, 0);
          expect(stakeInfo.amount).to.equal(stakeAmount);
          expect(stakeInfo.lockPeriod).to.equal(lockPeriod);
          expect(stakeInfo.autoCompound).to.be.false;
        });

        it(`should allow staking with ${periodName} lock with auto-compound`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          // Stake with auto-compound
          await expect(userFia.stake(stakeAmount, lockPeriod, true))
            .to.emit(fia, 'Staked')
            .withArgs(user.address, stakeAmount, lockPeriod, 0);
          
          // Verify stake info
          const stakeInfo = await fia.userStakes(user.address, 0);
          expect(stakeInfo.amount).to.equal(stakeAmount);
          expect(stakeInfo.lockPeriod).to.equal(lockPeriod);
          expect(stakeInfo.autoCompound).to.be.true;
        });

        it(`should accrue rewards and allow claiming for ${periodName} lock`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          await userFia.stake(stakeAmount, lockPeriod, false);
          
          // Simulate time passage (use 1/4 of lock period to generate some rewards)
          const timeAdvance = Math.floor(lockPeriod / 4);
          await ethers.provider.send('evm_increaseTime', [timeAdvance]);
          await ethers.provider.send('evm_mine');
          
          // Check pending rewards
          const pendingRewards = await fia.getStakingRewards(user.address);
          expect(BigInt(pendingRewards.toString()) > 0n).to.be.true;
          
          // Claim rewards
          const poolBefore = await fia.rewardPool();
          await expect(userFia.claimRewards(0))
            .to.emit(fia, 'RewardClaimed');
          
          const poolAfter = await fia.rewardPool();
          expect(BigInt(poolAfter.toString()) < BigInt(poolBefore.toString())).to.be.true;
        });

        it(`should auto-compound rewards when enabled for ${periodName} lock`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          await userFia.stake(stakeAmount, lockPeriod, true);
          
          // Simulate time passage
          const timeAdvance = Math.floor(lockPeriod / 4);
          await ethers.provider.send('evm_increaseTime', [timeAdvance]);
          await ethers.provider.send('evm_mine');
          
          const stakeInfoBefore = await fia.userStakes(user.address, 0);
          const amountBefore = BigInt(stakeInfoBefore.amount.toString());
          
          // Claim rewards (should auto-compound)
          await userFia.claimRewards(0);
          
          const stakeInfoAfter = await fia.userStakes(user.address, 0);
          const amountAfter = BigInt(stakeInfoAfter.amount.toString());
          
          expect(amountAfter > amountBefore).to.be.true;
        });

        it(`should allow unstaking after ${periodName} lock period without penalty`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          await userFia.stake(stakeAmount, lockPeriod, false);
          
          // Fast forward beyond lock period
          await ethers.provider.send('evm_increaseTime', [lockPeriod + 3600]); // +1 hour
          await ethers.provider.send('evm_mine');
          
          const balanceBefore = await fia.balanceOf(user.address);
          
          // Unstake (this will include principal + any accrued rewards)
          await expect(userFia.unstake(0))
            .to.emit(fia, 'Unstaked');
          
          const balanceAfter = await fia.balanceOf(user.address);
          const amountReceived = BigInt(balanceAfter.toString()) - BigInt(balanceBefore.toString());
          
          // Should receive at least the original stake amount (no penalty)
          expect(amountReceived >= BigInt(stakeAmount.toString())).to.be.true;
        });

        it(`should apply 10% penalty for early withdrawal from ${periodName} lock`, async function () {
          const fia = await deployAndSetupContract();
          const user = users[0];
          const stakeAmount = ethers.parseUnits('10000', 18);
          
          await fundUser(fia, user, '10000');
          const userFia = fia.connect(user);
          
          await userFia.stake(stakeAmount, lockPeriod, false);
          
          // Try to unstake early (half the lock period)
          await ethers.provider.send('evm_increaseTime', [Math.floor(lockPeriod / 2)]);
          await ethers.provider.send('evm_mine');
          
          const balanceBefore = await fia.balanceOf(user.address);
          const poolBefore = await fia.rewardPool();
          
          await userFia.unstake(0);
          
          const balanceAfter = await fia.balanceOf(user.address);
          const poolAfter = await fia.rewardPool();
          const amountReceived = BigInt(balanceAfter.toString()) - BigInt(balanceBefore.toString());
          
          // Should receive less than original stake due to 10% penalty
          const expectedMaxReturn = (BigInt(stakeAmount.toString()) * 90n) / 100n;
          expect(amountReceived <= expectedMaxReturn * 110n / 100n).to.be.true; // Allow for some rewards
          
          // Penalty should increase reward pool
          expect(BigInt(poolAfter.toString()) > BigInt(poolBefore.toString())).to.be.true;
        });
      });
    });
  });

  describe('Multiple Simultaneous Stakers', function () {
    it('should handle 10 users staking simultaneously with different lock periods', async function () {
      const fia = await deployAndSetupContract();
      const stakingUsers = users.slice(0, 10);
      const stakeAmount = ethers.parseUnits('5000', 18);
      
      // Fund all users
      for (const user of stakingUsers) {
        await fundUser(fia, user, '5000');
      }
      
      // All users stake with different lock periods (cycling through them)
      const stakePromises = stakingUsers.map(async (user, index) => {
        const userFia = fia.connect(user);
        const lockPeriod = lockPeriods[index % lockPeriods.length];
        const autoCompound = index % 2 === 0; // Alternate auto-compound
        
        await userFia.stake(stakeAmount, lockPeriod, autoCompound);
        return { user, lockPeriod, autoCompound, index };
      });
      
      const stakeResults = await Promise.all(stakePromises);
      
      // Verify all stakes were created
      for (const { user, lockPeriod, autoCompound, index } of stakeResults) {
        const stakeInfo = await fia.userStakes(user.address, 0);
        expect(stakeInfo.amount).to.equal(stakeAmount);
        expect(stakeInfo.lockPeriod).to.equal(lockPeriod);
        expect(stakeInfo.autoCompound).to.equal(autoCompound);
      }
      
      // Check total staked amount
      const totalStaked = await fia.totalStaked();
      const expectedTotal = BigInt(stakeAmount.toString()) * BigInt(stakingUsers.length);
      expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
    });

    it('should handle overlapping staking and unstaking events', async function () {
      const fia = await deployAndSetupContract();
      const stakingUsers = users.slice(0, 5);
      const stakeAmount = ethers.parseUnits('10000', 18);
      
      // Fund all users
      for (const user of stakingUsers) {
        await fundUser(fia, user, '20000'); // Extra funds for multiple stakes
      }
      
      // Phase 1: All users stake with 30-day lock
      for (let i = 0; i < stakingUsers.length; i++) {
        const userFia = fia.connect(stakingUsers[i]);
        await userFia.stake(stakeAmount, LOCK_30_DAYS, false);
      }
      
      // Phase 2: Advance time and some users stake again while others claim
      await ethers.provider.send('evm_increaseTime', [15 * 24 * 60 * 60]); // 15 days
      await ethers.provider.send('evm_mine');
      
      // Users 0,1 stake again, users 2,3 claim rewards, user 4 does nothing
      const userFia0 = fia.connect(stakingUsers[0]);
      const userFia1 = fia.connect(stakingUsers[1]);
      const userFia2 = fia.connect(stakingUsers[2]);
      const userFia3 = fia.connect(stakingUsers[3]);
      
      await Promise.all([
        userFia0.stake(stakeAmount, LOCK_90_DAYS, true),
        userFia1.stake(stakeAmount, LOCK_180_DAYS, false),
        userFia2.claimRewards(0),
        userFia3.claimRewards(0),
      ]);
      
      // Phase 3: Advance time past 30-day lock and some users unstake
      await ethers.provider.send('evm_increaseTime', [16 * 24 * 60 * 60]); // 16 more days
      await ethers.provider.send('evm_mine');
      
      // Users 2,3,4 can now unstake their first stakes (no penalty)
      await Promise.all([
        userFia2.unstake(0),
        userFia3.unstake(0),
        fia.connect(stakingUsers[4]).unstake(0),
      ]);
      
      // Verify final state
      const finalTotalStaked = await fia.totalStaked();
      // Should have: user0 (2 stakes), user1 (2 stakes), others (0 stakes)
      const expectedRemaining = BigInt(stakeAmount.toString()) * 4n;
      expect(BigInt(finalTotalStaked.toString())).to.equal(expectedRemaining);
    });
  });

  describe('Reward Calculation and APY Testing', function () {
    it('should calculate correct APY for different lock periods', async function () {
      const fia = await deployAndSetupContract();
      
      // Check APY rates for each lock period
      const expectedAPYs = [300, 500, 700, 900]; // 3%, 5%, 7%, 9%
      
      for (let i = 0; i < lockPeriods.length; i++) {
        const apy = await fia.stakingAPY(lockPeriods[i]);
        expect(apy).to.equal(expectedAPYs[i]);
      }
    });

    it('should handle insufficient reward pool gracefully', async function () {
      const fia = await fiaFactory.deploy(treasury.address, founder.address);
      await fia.waitForDeployment();
      await applyCommonTestSetup(fia, deployer);
      
      const user = users[0];
      const stakeAmount = ethers.parseUnits('100000', 18);
      
      // Set very small reward pool
      await fia.addToRewardPool(ethers.parseUnits('1', 18));
      await fundUser(fia, user, '100000');
      
      const userFia = fia.connect(user);
      await userFia.stake(stakeAmount, LOCK_365_DAYS, false);
      
      // Generate large rewards by advancing significant time
      await ethers.provider.send('evm_increaseTime', [180 * 24 * 60 * 60]); // 180 days
      await ethers.provider.send('evm_mine');
      
      const poolBefore = await fia.rewardPool();
      await userFia.claimRewards(0);
      const poolAfter = await fia.rewardPool();
      
      // Pool should be unchanged because reward > pool
      expect(BigInt(poolAfter.toString())).to.equal(BigInt(poolBefore.toString()));
    });
  });

  describe('Leaderboard and Analytics', function () {
    it('should track staking analytics correctly', async function () {
      const fia = await deployAndSetupContract();
      const stakingUsers = users.slice(0, 3);
      const stakeAmounts = [
        ethers.parseUnits('10000', 18),
        ethers.parseUnits('25000', 18),
        ethers.parseUnits('5000', 18),
      ];
      
      // Fund and stake with different amounts
      for (let i = 0; i < stakingUsers.length; i++) {
        await fundUser(fia, stakingUsers[i], ethers.formatUnits(stakeAmounts[i], 18));
        const userFia = fia.connect(stakingUsers[i]);
        await userFia.stake(stakeAmounts[i], LOCK_90_DAYS, false);
      }
      
      // Verify total staked
      const totalStaked = await fia.totalStaked();
      const expectedTotal = stakeAmounts.reduce((sum, amount) => sum + BigInt(amount.toString()), 0n);
      expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
      
      // Advance time and let users claim rewards
      await ethers.provider.send('evm_increaseTime', [45 * 24 * 60 * 60]); // 45 days
      await ethers.provider.send('evm_mine');
      
      // Check that all users have pending rewards
      for (const user of stakingUsers) {
        const pendingRewards = await fia.getStakingRewards(user.address);
        expect(BigInt(pendingRewards.toString()) > 0n).to.be.true;
      }
    });

    it('should provide correct staking information for leaderboard', async function () {
      const fia = await deployAndSetupContract();
      const stakingUsers = users.slice(0, 5);
      
      // Create different staking scenarios
      const scenarios = [
        { amount: '50000', lockPeriod: LOCK_365_DAYS, autoCompound: true },
        { amount: '30000', lockPeriod: LOCK_180_DAYS, autoCompound: false },
        { amount: '40000', lockPeriod: LOCK_90_DAYS, autoCompound: true },
        { amount: '20000', lockPeriod: LOCK_30_DAYS, autoCompound: false },
        { amount: '35000', lockPeriod: LOCK_180_DAYS, autoCompound: true },
      ];
      
      // Setup stakes
      for (let i = 0; i < stakingUsers.length; i++) {
        const user = stakingUsers[i];
        const scenario = scenarios[i];
        
        await fundUser(fia, user, scenario.amount);
        const userFia = fia.connect(user);
        await userFia.stake(ethers.parseUnits(scenario.amount, 18), scenario.lockPeriod, scenario.autoCompound);
      }
      
      // Simulate time and rewards
      await ethers.provider.send('evm_increaseTime', [60 * 24 * 60 * 60]); // 60 days
      await ethers.provider.send('evm_mine');
      
      // Collect leaderboard data
      const leaderboardData = [];
      for (let i = 0; i < stakingUsers.length; i++) {
        const user = stakingUsers[i];
        const stakeInfo = await fia.userStakes(user.address, 0);
        const pendingRewards = await fia.getStakingRewards(user.address);
        
        leaderboardData.push({
          address: user.address,
          stakedAmount: BigInt(stakeInfo.amount.toString()),
          lockPeriod: stakeInfo.lockPeriod,
          pendingRewards: BigInt(pendingRewards.toString()),
          autoCompound: stakeInfo.autoCompound
        });
      }
      
      // Sort by staked amount (descending) - simple leaderboard
      leaderboardData.sort((a, b) => {
        if (a.stakedAmount > b.stakedAmount) return -1;
        if (a.stakedAmount < b.stakedAmount) return 1;
        return 0;
      });
      
      // Verify leaderboard order matches expected (50k, 40k, 35k, 30k, 20k)
      const expectedOrder = ['50000', '40000', '35000', '30000', '20000'];
      for (let i = 0; i < expectedOrder.length; i++) {
        const expectedAmount = BigInt(ethers.parseUnits(expectedOrder[i], 18).toString());
        expect(leaderboardData[i].stakedAmount).to.equal(expectedAmount);
      }
    });
  });

  describe('Edge Cases and Stress Testing', function () {
    it('should handle maximum number of stakes per user', async function () {
      const fia = await deployAndSetupContract();
      const user = users[0];
      const stakeAmount = ethers.parseUnits('1000', 18);
      
      // Fund user with enough tokens for multiple stakes
      await fundUser(fia, user, '50000');
      const userFia = fia.connect(user);
      
      // Create multiple stakes
      const numStakes = 10;
      for (let i = 0; i < numStakes; i++) {
        const lockPeriod = lockPeriods[i % lockPeriods.length];
        await userFia.stake(stakeAmount, lockPeriod, i % 2 === 0);
      }
      
      // Verify all stakes were created
      for (let i = 0; i < numStakes; i++) {
        const stakeInfo = await fia.userStakes(user.address, i);
        expect(stakeInfo.amount).to.equal(stakeAmount);
      }
      
      // Advance time and claim rewards from different stakes
      await ethers.provider.send('evm_increaseTime', [45 * 24 * 60 * 60]); // 45 days
      await ethers.provider.send('evm_mine');
      
      // Claim rewards from every other stake
      for (let i = 0; i < numStakes; i += 2) {
        await userFia.claimRewards(i);
      }
      
      // Unstake some positions after appropriate time
      await ethers.provider.send('evm_increaseTime', [31 * 24 * 60 * 60]); // Total 76 days
      await ethers.provider.send('evm_mine');
      
      // Unstake 30-day locks (should be penalty-free by now)
      for (let i = 0; i < numStakes; i++) {
        const stakeInfo = await fia.userStakes(user.address, i);
        if (stakeInfo.lockPeriod === LOCK_30_DAYS && stakeInfo.amount > 0) {
          await userFia.unstake(i);
        }
      }
    });

    it('should handle concurrent operations without state corruption', async function () {
      const fia = await deployAndSetupContract();
      const concurrentUsers = users.slice(0, 3);
      const stakeAmount = ethers.parseUnits('10000', 18);
      
      // Fund all users
      for (const user of concurrentUsers) {
        await fundUser(fia, user, '20000');
      }
      
      // Round 1: All users stake simultaneously
      await Promise.all(concurrentUsers.map(async (user, index) => {
        const userFia = fia.connect(user);
        return userFia.stake(stakeAmount, lockPeriods[index % lockPeriods.length], false);
      }));
      
      // Advance time
      await ethers.provider.send('evm_increaseTime', [15 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Round 2: Mixed operations simultaneously
      const userFia0 = fia.connect(concurrentUsers[0]);
      const userFia1 = fia.connect(concurrentUsers[1]);
      const userFia2 = fia.connect(concurrentUsers[2]);
      
      await Promise.all([
        userFia0.stake(stakeAmount, LOCK_90_DAYS, true), // Second stake
        userFia1.claimRewards(0), // Claim rewards
        userFia2.stake(stakeAmount, LOCK_180_DAYS, false), // Second stake
      ]);
      
      // Verify state consistency
      const totalStaked = await fia.totalStaked();
      const expectedTotal = BigInt(stakeAmount.toString()) * 5n; // 5 stakes total
      expect(BigInt(totalStaked.toString())).to.equal(expectedTotal);
      
      // Verify individual user states
      const stake0_0 = await fia.userStakes(concurrentUsers[0].address, 0);
      const stake0_1 = await fia.userStakes(concurrentUsers[0].address, 1);
      const stake1_0 = await fia.userStakes(concurrentUsers[1].address, 0);
      const stake2_0 = await fia.userStakes(concurrentUsers[2].address, 0);
      const stake2_1 = await fia.userStakes(concurrentUsers[2].address, 1);
      
      expect(stake0_0.amount).to.equal(stakeAmount);
      expect(stake0_1.amount).to.equal(stakeAmount);
      expect(stake1_0.amount).to.equal(stakeAmount);
      expect(stake2_0.amount).to.equal(stakeAmount);
      expect(stake2_1.amount).to.equal(stakeAmount);
    });
  });
});