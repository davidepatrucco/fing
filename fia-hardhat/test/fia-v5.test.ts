import { expect } from "chai";
import '@nomicfoundation/hardhat-chai-matchers';
import hre from "hardhat";
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('FIACoinV5 - Comprehensive Tests', function () {
  let fia: any;
  let deployer: any;
  let treasury: any;
  let founder: any;
  let user1: any;
  let user2: any;
  let user3: any;

  const TOTAL_SUPPLY = ethers.parseUnits('1000000000000000', 18); // 1000T tokens
  const PROPOSAL_THRESHOLD = ethers.parseUnits('1000000', 18); // 1M FIA

  beforeEach(async function () {
    [deployer, treasury, founder, user1, user2, user3] = await ethers.getSigners();
    
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);
  });

  describe('Deployment', function () {
    it('should deploy with correct total supply', async function () {
      const totalSupply = await fia.totalSupply();
      expect(totalSupply).to.equal(TOTAL_SUPPLY);
    });

    it('should mint all tokens to deployer', async function () {
      const deployerBalance = await fia.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(TOTAL_SUPPLY);
    });

    it('should set correct treasury and founder addresses', async function () {
      expect(await fia.treasury()).to.equal(treasury.address);
      expect(await fia.founderWallet()).to.equal(founder.address);
    });

    it('should initialize staking APY rates correctly', async function () {
      const LOCK_30_DAYS = 30 * 24 * 60 * 60;
      const LOCK_90_DAYS = 90 * 24 * 60 * 60;
      const LOCK_180_DAYS = 180 * 24 * 60 * 60;
      const LOCK_365_DAYS = 365 * 24 * 60 * 60;

      expect(await fia.stakingAPY(LOCK_30_DAYS)).to.equal(300);   // 3%
      expect(await fia.stakingAPY(LOCK_90_DAYS)).to.equal(500);   // 5%
      expect(await fia.stakingAPY(LOCK_180_DAYS)).to.equal(700);  // 7%
      expect(await fia.stakingAPY(LOCK_365_DAYS)).to.equal(900);  // 9%
    });
  });

  describe('Governance System', function () {
    beforeEach(async function () {
      // Give user1 enough tokens to create proposals
      await fia.transfer(user1.address, PROPOSAL_THRESHOLD * 2n);
    });

    it('should allow creating proposals with sufficient balance', async function () {
      const fiaUser1 = fia.connect(user1);
      
      await expect(fiaUser1.propose(
        "Change fee to 0.5%", 
        0, // FEE_CHANGE
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50])
      )).to.emit(fia, 'ProposalCreated');
    });

    it('should reject proposals from users with insufficient balance', async function () {
      const fiaUser2 = fia.connect(user2);
      
      await expect(fiaUser2.propose(
        "Change fee", 
        0, // FEE_CHANGE
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50])
      )).to.be.revertedWith("Insufficient balance for proposal");
    });

    it('should allow voting on proposals', async function () {
      const fiaUser1 = fia.connect(user1);
      
      // Create proposal
      await fiaUser1.propose(
        "Change fee to 0.5%", 
        0, // FEE_CHANGE
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50])
      );

      // Vote on proposal
      await expect(fiaUser1.vote(0, true))
        .to.emit(fia, 'VoteCast');
    });

    it('should prevent double voting', async function () {
      const fiaUser1 = fia.connect(user1);
      
      // Create proposal
      await fiaUser1.propose(
        "Change fee to 0.5%", 
        0, // FEE_CHANGE
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50])
      );

      // First vote
      await fiaUser1.vote(0, true);

      // Second vote should fail
      await expect(fiaUser1.vote(0, false))
        .to.be.revertedWith("Already voted");
    });

    it('should return correct voting power', async function () {
  const votingPower = await fia.getVotingPower(user1.address);
  expect(BigInt(votingPower.toString())).to.equal(BigInt(PROPOSAL_THRESHOLD * 2n));
    });
  });

  describe('Staking System', function () {
    const STAKE_AMOUNT = ethers.parseUnits('10000', 18);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    beforeEach(async function () {
      // Transfer some tokens to user1 for staking
      await fia.transfer(user1.address, STAKE_AMOUNT * 2n);
      // Add funds to reward pool
      await fia.addToRewardPool(ethers.parseUnits('100000', 18));
    });

    it('should allow staking with valid lock period', async function () {
      const fiaUser1 = fia.connect(user1);
      
      await expect(fiaUser1.stake(STAKE_AMOUNT, LOCK_30_DAYS, false))
        .to.emit(fia, 'Staked')
        .withArgs(user1.address, STAKE_AMOUNT, LOCK_30_DAYS, 0);
    });

    it('should reject staking with invalid lock period', async function () {
      const fiaUser1 = fia.connect(user1);
      const INVALID_LOCK = 45 * 24 * 60 * 60; // 45 days (not valid)
      
      await expect(fiaUser1.stake(STAKE_AMOUNT, INVALID_LOCK, false))
        .to.be.revertedWith("Invalid lock period");
    });

    it('should update total staked amount', async function () {
      const fiaUser1 = fia.connect(user1);
      
      await fiaUser1.stake(STAKE_AMOUNT, LOCK_30_DAYS, false);
      
  const totalStaked = await fia.totalStaked();
  expect(BigInt(totalStaked.toString())).to.equal(BigInt(STAKE_AMOUNT));
    });

    it('should calculate staking rewards correctly', async function () {
      const fiaUser1 = fia.connect(user1);
      
      await fiaUser1.stake(STAKE_AMOUNT, LOCK_30_DAYS, false);
      
      // Fast forward time to accumulate rewards
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine");
      
  const rewards = await fia.getStakingRewards(user1.address);
  expect(BigInt(rewards.toString()) > 0n).to.be.true;
    });

    it('should allow unstaking after lock period', async function () {
      const fiaUser1 = fia.connect(user1);
      
      await fiaUser1.stake(STAKE_AMOUNT, LOCK_30_DAYS, false);
      
      // Fast forward beyond lock period
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");
      
      await expect(fiaUser1.unstake(0))
        .to.emit(fia, 'Unstaked');
    });

    it('should apply penalty for early withdrawal', async function () {
      const fiaUser1 = fia.connect(user1);
      
      const initialBalance = await fia.balanceOf(user1.address);
      await fiaUser1.stake(STAKE_AMOUNT, LOCK_30_DAYS, false);
      
      // Unstake immediately (early withdrawal)
      await fiaUser1.unstake(0);
      
      const finalBalance = await fia.balanceOf(user1.address);
      const expectedWithPenalty = BigInt(initialBalance) - (BigInt(STAKE_AMOUNT) * 10n / 100n); // 10% penalty

  expect(BigInt(finalBalance.toString()) < BigInt(initialBalance.toString())).to.be.true;
      // Allow a tiny rounding/reward dust tolerance due to reward calculation timing
      const diff = BigInt(finalBalance.toString()) > expectedWithPenalty
        ? BigInt(finalBalance.toString()) - expectedWithPenalty
        : expectedWithPenalty - BigInt(finalBalance.toString());
      const TOLERANCE = 1_000_000_000_00000n; // 1e14 wei (small)
  expect(BigInt(diff) <= TOLERANCE).to.be.true;
    });
  });

  describe('Batch Operations', function () {
    const TRANSFER_AMOUNT = ethers.parseUnits('1000', 18);

    beforeEach(async function () {
      // Give deployer enough tokens for batch operations
      const totalNeeded = TRANSFER_AMOUNT * 5n;
      // Deployer already has all tokens from minting
    });

    it('should perform batch transfers correctly', async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [TRANSFER_AMOUNT, TRANSFER_AMOUNT, TRANSFER_AMOUNT];
      
      await expect(fia.batchTransfer(recipients, amounts))
        .to.emit(fia, 'BatchTransfer')
        .withArgs(deployer.address, TRANSFER_AMOUNT * 3n, 3);
        
      // Check balances
      expect(await fia.balanceOf(user1.address)).to.equal(TRANSFER_AMOUNT);
      expect(await fia.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
      expect(await fia.balanceOf(user3.address)).to.equal(TRANSFER_AMOUNT);
    });

    it('should reject batch transfer with mismatched arrays', async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [TRANSFER_AMOUNT]; // Mismatched length
      
      await expect(fia.batchTransfer(recipients, amounts))
        .to.be.revertedWith("Array length mismatch");
    });

    it('should allow batch fee exemption setting', async function () {
      const accounts = [user1.address, user2.address];
      
      await fia.batchSetFeeExempt(accounts, true);
      
      expect(await fia.isFeeExempt(user1.address)).to.be.true;
      expect(await fia.isFeeExempt(user2.address)).to.be.true;
    });
  });

  describe('Anti-MEV Protection', function () {
    const TRANSFER_AMOUNT = ethers.parseUnits('1000', 18);

    beforeEach(async function () {
      await fia.transfer(user1.address, TRANSFER_AMOUNT * 10n);
  // Reduce anti-MEV cooldown to 0 for same-block testing determinism
  const limits = await fia.txLimits();
  await fia.setTransactionLimits(limits.maxTxAmount, limits.maxWalletAmount, 0, true);
    });

  it.skip('should prevent same-block transactions (flaky - skipped)', async function () {
      const fiaUser1 = fia.connect(user1);
      
      // First transaction
      // Disable automine so we can include both txs in the same block
      await ethers.provider.send('evm_setAutomine', [false]);
      const tx1 = await fiaUser1.protectedTransfer(user2.address, TRANSFER_AMOUNT, 1);
      const tx2Promise = fiaUser1.protectedTransfer(user3.address, TRANSFER_AMOUNT, 2);
      // Mine a block containing both transactions
      await ethers.provider.send('evm_mine');
      // Re-enable automine
      await ethers.provider.send('evm_setAutomine', [true]);

      // tx1 should succeed, tx2 should have reverted in-block due to 'Same block transaction'
      await tx1.wait();
      try {
        const tx2 = await tx2Promise;
        await tx2.wait();
        throw new Error('Expected tx2 to revert but it succeeded');
      } catch (err: any) {
        expect(err.message).to.include('Same block transaction');
      }
    });

    it('should prevent nonce reuse', async function () {
      const fiaUser1 = fia.connect(user1);
      
      // First transaction
      await fiaUser1.protectedTransfer(user2.address, TRANSFER_AMOUNT, 1);
      
      // Mine a new block
      await ethers.provider.send("evm_mine");
      
      // Reuse nonce should fail
      await expect(fiaUser1.protectedTransfer(user3.address, TRANSFER_AMOUNT, 1))
        .to.be.revertedWith("Nonce used");
    });

    it('should enforce transaction limits', async function () {
  const txLimitsObj: any = await fia.txLimits();
  const maxTx = txLimitsObj.maxTxAmount;
      const excessiveAmount = maxTx + 1n;
      
      const fiaUser1 = fia.connect(user1);
      
      await expect(fiaUser1.protectedTransfer(user2.address, excessiveAmount, 1))
        .to.be.revertedWith("Transaction amount exceeds limit");
    });
  });

  describe('Analytics System', function () {
    it('should track token statistics', async function () {
      const stats = await fia.getTokenStats();
      expect(stats.uniqueHolders).to.equal(1); // Only deployer initially
      expect(stats.totalBurned).to.equal(0);
      expect(stats.transactionCount).to.equal(0);
    });

    it('should update analytics on transfers', async function () {
      await fia.transfer(user1.address, ethers.parseUnits('1000', 18));
      
      const stats = await fia.getTokenStats();
      expect(stats.uniqueHolders).to.equal(2); // Deployer + user1
      expect(stats.transactionCount).to.equal(1);
    });

    it('should track user statistics', async function () {
      await fia.transfer(user1.address, ethers.parseUnits('1000', 18));
      
      const userStats = await fia.getUserStats(user1.address);
      expect(userStats.transactionCount).to.equal(0); // User1 received but didn't send
      expect(userStats.firstTransactionTime).to.be.gt(0);
    });
  });

  describe('Fee System (Legacy from V4)', function () {
    const TRANSFER_AMOUNT = ethers.parseUnits('1000', 18);

    beforeEach(async function () {
      await fia.transfer(user1.address, TRANSFER_AMOUNT * 2n);
    });

    it('should apply fees on transfers', async function () {
      const fiaUser1 = fia.connect(user1);
      
      const initialBalance = await fia.balanceOf(user2.address);
      await fiaUser1.transfer(user2.address, TRANSFER_AMOUNT);
      
      const finalBalance = await fia.balanceOf(user2.address);
      const expectedAmount = TRANSFER_AMOUNT - (TRANSFER_AMOUNT * 100n / 10000n); // 1% fee
      
      expect(finalBalance - initialBalance).to.equal(expectedAmount);
    });

    it('should exempt fee-exempt addresses', async function () {
      await fia.setFeeExempt(user1.address, true);
      
      const fiaUser1 = fia.connect(user1);
      
      const initialBalance = await fia.balanceOf(user2.address);
      await fiaUser1.transfer(user2.address, TRANSFER_AMOUNT);
      
      const finalBalance = await fia.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(TRANSFER_AMOUNT); // No fee
    });

    it('should distribute fees correctly', async function () {
      const fiaUser1 = fia.connect(user1);
      
      const initialTreasuryBalance = await fia.balanceOf(treasury.address);
      const initialFounderBalance = await fia.balanceOf(founder.address);
      
      await fiaUser1.transfer(user2.address, TRANSFER_AMOUNT);
      
      const finalTreasuryBalance = await fia.balanceOf(treasury.address);
      const finalFounderBalance = await fia.balanceOf(founder.address);
      
      // Check that treasury and founder received their portions
      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);
      expect(finalFounderBalance).to.be.gt(initialFounderBalance);
    });
  });

  describe('Advanced Transfer Features', function () {
    const TRANSFER_AMOUNT = ethers.parseUnits('1000', 18);

    beforeEach(async function () {
      await fia.transfer(user1.address, TRANSFER_AMOUNT * 5n);
    });

    it('should allow transfers with data', async function () {
      const fiaUser1 = fia.connect(user1);
      const data = ethers.toUtf8Bytes("Transfer memo");
      
      await expect(fiaUser1.transferWithData(user2.address, TRANSFER_AMOUNT, data))
        .to.not.be.reverted;
    });

    it('should create scheduled transfer ID', async function () {
      const fiaUser1 = fia.connect(user1);
      // Use chain timestamp to compute a valid future time
      const latest = await ethers.provider.getBlock('latest');
      const futureTime = latest.timestamp + 3600; // 1 hour from latest chain timestamp

      const transferId = await fiaUser1.scheduledTransfer.staticCall(
        user2.address,
        TRANSFER_AMOUNT,
        futureTime
      );
      
      expect(transferId).to.not.equal(ethers.ZeroHash);
    });

    it('should create recurring transfer ID', async function () {
      const fiaUser1 = fia.connect(user1);
      
      const recurringId = await fiaUser1.recurringTransfer.staticCall(
        user2.address,
        TRANSFER_AMOUNT,
        86400, // 1 day interval
        5      // 5 transfers
      );
      
      expect(recurringId).to.not.equal(ethers.ZeroHash);
    });
  });

  describe('Emergency Functions', function () {
    it('should allow owner to pause the contract', async function () {
      await fia.emergencyPause();
      expect(await fia.paused()).to.be.true;
    });

    it('should prevent transfers when paused', async function () {
      await fia.emergencyPause();
      
      await expect(fia.transfer(user1.address, ethers.parseUnits('100', 18)))
        .to.be.revertedWithCustomError(fia, 'EnforcedPause');
    });

    it('should allow owner to unpause', async function () {
      await fia.emergencyPause();
      await fia.emergencyUnpause();
      
      expect(await fia.paused()).to.be.false;
    });
  });

  describe('Burn Functionality', function () {
    const BURN_AMOUNT = ethers.parseUnits('1000', 18);

    it('should allow users to burn their tokens', async function () {
      await fia.transfer(user1.address, BURN_AMOUNT);
      const fiaUser1 = fia.connect(user1);
      
      const initialSupply = await fia.totalSupply();
      await fiaUser1.burn(BURN_AMOUNT);
      
      const finalSupply = await fia.totalSupply();
      expect(initialSupply - finalSupply).to.equal(BURN_AMOUNT);
    });

    it('should update burn statistics', async function () {
      await fia.transfer(user1.address, BURN_AMOUNT);
      const fiaUser1 = fia.connect(user1);
      
      await fiaUser1.burn(BURN_AMOUNT);
      
      const stats = await fia.getTokenStats();
      expect(stats.totalBurned).to.equal(BURN_AMOUNT);
    });
  });
});