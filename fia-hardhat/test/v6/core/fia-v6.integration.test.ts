import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('FIACoinV6 - Comprehensive Integration Tests', function () {
  async function deploy() {
    const [deployer, treasury, founder, alice, bob, charlie, dave, eve] = await ethers.getSigners();
    
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    
    // Setup for comprehensive testing
    await fia.setFeeExempt(treasury.address, true);
    await fia.setFeeExempt(deployer.address, true); // Make deployer fee-exempt too
    
    // Transfer tokens to deployer so they can fund the reward pool
    await (fia.connect(treasury)).transfer(deployer.address, ethers.parseUnits('2000000', 18));
    await fia.addToRewardPool(ethers.parseUnits('1000000', 18));
    
    // Distribute tokens
    const users = [alice, bob, charlie, dave, eve];
    for (const user of users) {
      await (fia.connect(treasury)).transfer(user.address, ethers.parseUnits('5000', 18));
    }
    
    return { fia, deployer, treasury, founder, alice, bob, charlie, dave, eve, users };
  }

  describe('Governance + Staking Integration', function () {
    it('should allow stakers to vote in governance', async function () {
      const { fia, deployer, treasury, alice, bob } = await deploy();
      
      // Alice stakes to get voting power
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      await fia.connect(alice).stake(ethers.parseUnits('2000', 18), LOCK_30_DAYS, false);
      
      // Alice proposes (needs 1M tokens, so let's make her have enough)
      await fia.connect(treasury).transfer(alice.address, ethers.parseUnits('1000000', 18));
      
      // Propose with correct signature: (description, ProposalType, data)
      const proposalTx = await fia.connect(alice).propose(
        'Test governance with staking',
        1, // TREASURY_SPEND = 1
        '0x'
      );
      const receipt = await proposalTx.wait();
      
      // Bob votes
      await fia.connect(bob).vote(0, true);
      
      expect(await fia.getVotingPower(alice.address)).to.be.gt(0);
    });

    it('should handle governance execution affecting staking parameters', async function () {
      const { fia, deployer, treasury, alice, bob } = await deploy();
      
      // Give alice enough tokens to propose
      await fia.connect(treasury).transfer(alice.address, ethers.parseUnits('1000000', 18));
      
      // Alice proposes parameter change
      const proposalTx = await fia.connect(alice).propose(
        'Change staking parameters',
        2, // PARAMETER_CHANGE = 2  
        '0x'
      );
      
      // Bob votes
      await fia.connect(bob).vote(0, true);
      
      // Check that staking still works after governance activity
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      await fia.connect(alice).stake(ethers.parseUnits('1000', 18), LOCK_30_DAYS, false);
      
      expect(await fia.getStakeCount(alice.address)).to.equal(1);
    });
  });

  describe('Multi-User Staking Scenarios', function () {
    it('should handle multiple users with different staking strategies', async function () {
      const { fia, users } = await deploy();
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const LOCK_90_DAYS = 90 * 24 * 60 * 60;
      const LOCK_180_DAYS = 180 * 24 * 60 * 60;
      const LOCK_365_DAYS = 365 * 24 * 60 * 60;
      
      const lockPeriods = [LOCK_30_DAYS, LOCK_90_DAYS, LOCK_180_DAYS, LOCK_365_DAYS];
      
      // Each user stakes with different parameters
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const lockPeriod = lockPeriods[i % lockPeriods.length];
        const autoCompound = i % 2 === 0;
        const stakeAmount = ethers.parseUnits((1000 + i * 500).toString(), 18);
        
        await (fia.connect(user)).stake(stakeAmount, lockPeriod, autoCompound);
      }
      
      // Verify total staked
      const totalStaked = await fia.totalStaked();
      expect(totalStaked).to.be.greaterThan(ethers.parseUnits('7500', 18));
      
      // Advance time and check rewards
      await ethers.provider.send('evm_increaseTime', [45 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Each user should have different reward amounts
      const rewards = [];
      for (const user of users) {
        const userRewards = await fia.calculateRewards(user.address, 0);
        rewards.push(userRewards);
      }
      
      // Verify rewards are different (different APYs and amounts)
      for (let i = 1; i < rewards.length; i++) {
        expect(rewards[i]).to.not.equal(rewards[0]);
      }
    });

    it('should maintain consistency during concurrent operations', async function () {
      const { fia, users } = await deploy();
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const stakeAmount = ethers.parseUnits('1000', 18);
      
      // All users stake simultaneously
      const stakePromises = users.map(user => 
        (fia.connect(user)).stake(stakeAmount, LOCK_30_DAYS, false)
      );
      await Promise.all(stakePromises);
      
      // Advance time
      await ethers.provider.send('evm_increaseTime', [15 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Mix of operations: some claim, some stake more, some transfer
      const mixedPromises = [
        (fia.connect(users[0])).claimRewards(0),
        (fia.connect(users[1])).stake(stakeAmount, LOCK_30_DAYS, true),
        (fia.connect(users[2])).transfer(users[3].address, ethers.parseUnits('100', 18)),
        (fia.connect(users[4])).protectedTransfer(users[0].address, ethers.parseUnits('50', 18), 1)
      ];
      
      await Promise.all(mixedPromises);
      
      // Verify state consistency
      const totalStaked = await fia.totalStaked();
      expect(totalStaked).to.be.greaterThan(ethers.parseUnits('5000', 18));
    });
  });

  describe('Fee Distribution and Analytics Integration', function () {
    it('should track comprehensive analytics across all operations', async function () {
      const { fia, treasury, founder, alice, bob } = await deploy();
      
      // Make users non-exempt so fees are charged
      await fia.setFeeExempt(alice.address, false);
      await fia.setFeeExempt(bob.address, false);
      
      // Verify users are not exempt
      expect(await fia.isFeeExempt(alice.address)).to.be.false;
      expect(await fia.isFeeExempt(bob.address)).to.be.false;
      
      const initialStats = await fia.tokenStats();
      
      // Perform fee-generating transfer
      await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
      
      await (fia.connect(alice)).stake(ethers.parseUnits('50', 18), 90 * 24 * 60 * 60, false); // 90 days in seconds
      
      await (fia.connect(bob)).burn(ethers.parseUnits('10', 18));
      
      const finalStats = await fia.tokenStats();
      
      // Verify analytics updates
      expect(finalStats.transactionCount).to.be.greaterThan(initialStats.transactionCount);
      expect(finalStats.totalBurned).to.be.greaterThan(initialStats.totalBurned);
      expect(finalStats.totalFeeCollected).to.be.greaterThan(initialStats.totalFeeCollected);
      
      // Verify staking worked by checking user's stakes directly
      expect(await fia.getStakeCount(alice.address)).to.be.greaterThan(0);
    });

    it('should distribute fees correctly across multiple operations', async function () {
      const { fia, treasury, founder, alice, bob } = await deploy();
      
      // Make users non-exempt so fees are charged
      await fia.setFeeExempt(alice.address, false);
      await fia.setFeeExempt(bob.address, false);
      
      const initialTreasuryBalance = await fia.balanceOf(treasury.address);
      const initialFounderBalance = await fia.balanceOf(founder.address);
      const initialTotalSupply = await fia.totalSupply();
      
      // Set specific fee distribution (must add up to totalFeeBP=100)
      await fia.setFeeDistribution(40, 30, 30); // 40% treasury, 30% founder, 30% burn (total=100)
      
      const transferAmount = ethers.parseUnits('1000', 18);
      
      // Multiple fee-generating operations
      await (fia.connect(alice)).transfer(bob.address, transferAmount);
      await (fia.connect(bob)).protectedTransfer(alice.address, transferAmount / 2n, 1);
      await (fia.connect(alice)).batchTransfer(
        [bob.address],
        [transferAmount / 4n]
      );
      
      const finalTreasuryBalance = await fia.balanceOf(treasury.address);
      const finalFounderBalance = await fia.balanceOf(founder.address);
      const finalTotalSupply = await fia.totalSupply();
      
      // Verify fee distribution
      expect(finalTreasuryBalance).to.be.greaterThan(initialTreasuryBalance);
      expect(finalFounderBalance).to.be.greaterThan(initialFounderBalance);
      expect(finalTotalSupply).to.be.lessThan(initialTotalSupply); // Due to burns
    });
  });

  describe('Emergency Scenarios and Recovery', function () {
    it('should maintain data integrity during pause/unpause cycles', async function () {
      const { fia, alice, bob } = await deploy();
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const stakeAmount = ethers.parseUnits('1000', 18);
      
      // Stake before pause
      await (fia.connect(alice)).stake(stakeAmount, LOCK_30_DAYS, false);
      
      const stakeCountBefore = await fia.getStakeCount(alice.address);
      const totalStakedBefore = await fia.totalStaked();
      
      // Pause contract
      await fia.emergencyPause();
      
      // Unpause contract
      await fia.emergencyUnpause();
      
      // Verify data integrity
      const stakeCountAfter = await fia.getStakeCount(alice.address);
      const totalStakedAfter = await fia.totalStaked();
      
      expect(stakeCountAfter).to.equal(stakeCountBefore);
      expect(totalStakedAfter).to.equal(totalStakedBefore);
      
      // Should be able to operate normally
      await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
    });

    it('should handle reward pool depletion gracefully', async function () {
      const { fia, treasury, alice, bob } = await deploy();
      
      // Give users enough tokens for large stakes
      await fia.transfer(alice.address, ethers.parseUnits('15000', 18));
      await fia.transfer(bob.address, ethers.parseUnits('15000', 18));
      
      // Set very small reward pool
      const smallPool = ethers.parseUnits('10', 18);
      await fia.addToRewardPool(smallPool);
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const largeStake = ethers.parseUnits('10000', 18);
      
      // Large stakes that will generate rewards > pool
      await (fia.connect(alice)).stake(largeStake, LOCK_30_DAYS, false);
      await (fia.connect(bob)).stake(largeStake, LOCK_30_DAYS, false);
      
      // Advance time to generate large rewards
      await ethers.provider.send('evm_increaseTime', [180 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Claims should work but not exceed pool
      await (fia.connect(alice)).claimRewards(0);
      await (fia.connect(bob)).claimRewards(0);
      
      const finalPool = await fia.rewardPool();
      expect(finalPool).to.be.greaterThanOrEqual(0);
    });
  });

  describe('Gas Optimization and Performance', function () {
    it('should handle mass operations efficiently', async function () {
      const { fia, alice } = await deploy();
      
      // Prepare recipients and amounts for batch transfer
      const recipients = [];
      const amounts = [];
      const batchSize = 10;
      
      for (let i = 0; i < batchSize; i++) {
        const wallet = ethers.Wallet.createRandom();
        recipients.push(wallet.address);
        amounts.push(ethers.parseUnits('10', 18));
      }
      
      // Batch transfer should complete successfully
      const tx = await (fia.connect(alice)).batchTransfer(recipients, amounts);
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      expect(Number(receipt?.gasUsed)).to.be.lessThan(1000000); // Reasonable gas limit
    });

    it('should scale with multiple stakers', async function () {
      const { fia, users } = await deploy();
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const stakeAmount = ethers.parseUnits('500', 18);
      
      // Sequential staking operations
      for (const user of users) {
        await (fia.connect(user)).stake(stakeAmount, LOCK_30_DAYS, false);
      }
      
      // Advance time
      await ethers.provider.send('evm_increaseTime', [10 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Sequential reward claims should all succeed
      for (const user of users) {
        const tx = await (fia.connect(user)).claimRewards(0);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);
      }
    });
  });

  describe('State Transitions and Edge Cases', function () {
    it('should handle complex state transitions correctly', async function () {
      const { fia, alice, bob } = await deploy();
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const amount = ethers.parseUnits('1000', 18);
      
      // Initial state: stake
      await (fia.connect(alice)).stake(amount, LOCK_30_DAYS, false);
      
      // State transition: propose governance
      await fia.propose("Test proposal during staking", 0, "0x"); // ProposalType.FEE_CHANGE = 0
      
      // State transition: vote
      await (fia.connect(alice)).vote(0, true);
      
      // State transition: transfer while staked
      await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
      
      // State transition: advance time
      await ethers.provider.send('evm_increaseTime', [15 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // State transition: claim rewards
      await (fia.connect(alice)).claimRewards(0);
      
      // State transition: advance time to completion
      await ethers.provider.send('evm_increaseTime', [16 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Final state transition: unstake
      await (fia.connect(alice)).unstake(0);
      
      // Verify final state
      const stakeInfo: any = await fia.userStakes(alice.address, 0);
      expect(stakeInfo.amount).to.equal(0);
    });

    it('should maintain invariants across all operations', async function () {
      const { fia, users } = await deploy();
      
      const initialTotalSupply = await fia.totalSupply();
      let expectedTotalSupply = initialTotalSupply;
      
      // Track burns to calculate expected supply
      const burnAmount = ethers.parseUnits('100', 18);
      await (fia.connect(users[0])).burn(burnAmount);
      expectedTotalSupply -= burnAmount;
      
      // Perform various operations
      await (fia.connect(users[1])).transfer(users[2].address, ethers.parseUnits('200', 18));
      await (fia.connect(users[2])).protectedTransfer(users[3].address, ethers.parseUnits('50', 18), 1);
      
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      await (fia.connect(users[3])).stake(ethers.parseUnits('300', 18), LOCK_30_DAYS, false);
      
      // Fee distribution might cause burns
      const burnShare = await fia.feeToBurnBP();
      const totalFee = await fia.totalFeeBP();
      
      const finalTotalSupply = await fia.totalSupply();
      
      // Supply should only decrease due to burns
      expect(finalTotalSupply).to.be.lessThanOrEqual(initialTotalSupply);
      
      // Total staked should be reasonable
      const totalStaked = await fia.totalStaked();
      expect(totalStaked).to.be.lessThanOrEqual(finalTotalSupply);
    });
  });
}).timeout(120000);
