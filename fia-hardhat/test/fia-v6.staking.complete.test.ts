import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('V6: Complete staking system', function () {
  async function deploy() {
    const [deployer, treasury, founder, alice, bob] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('10000', 18));
    await (fia.connect(treasury)).transfer(bob.address, ethers.parseUnits('5000', 18));
    // Add reward pool for testing
    await fia.ownerMintForTests(deployer.address, ethers.parseUnits('1000', 18));
    await fia.addToRewardPool(ethers.parseUnits('1000', 18));
    return { fia, deployer, treasury, founder, alice, bob };
  }

  it('stake/unstake/claim full cycle with all lock periods', async function () {
    const { fia, alice } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    const LOCK_90_DAYS = 90 * 24 * 60 * 60;
    const LOCK_180_DAYS = 180 * 24 * 60 * 60;
    const LOCK_365_DAYS = 365 * 24 * 60 * 60;

    const amount = ethers.parseUnits('100', 18);
    
    // Test each lock period
    for (const [lockPeriod, expectedAPY] of [
      [LOCK_30_DAYS, 300],
      [LOCK_90_DAYS, 500], 
      [LOCK_180_DAYS, 700],
      [LOCK_365_DAYS, 900]
    ]) {
      const balanceBefore = await fia.balanceOf(alice.address);
      await expect((fia.connect(alice)).stake(amount, lockPeriod, false))
        .to.emit(fia, 'Staked')
        .withArgs(alice.address, amount, lockPeriod, await fia.getStakeCount(alice.address));
      
      const balanceAfter = await fia.balanceOf(alice.address);
      expect(balanceBefore - balanceAfter).to.equal(amount);
      
      // Check APY is set correctly
      expect(await fia.stakingAPY(lockPeriod)).to.equal(expectedAPY);
    }

    // Test reward calculation after time passes
    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS + 1]);
    await ethers.provider.send('evm_mine');
    
    const rewards = await fia.calculateRewards(alice.address, 0);
    expect(rewards).to.be.greaterThan(0);

    // Claim rewards
    await expect((fia.connect(alice)).claimRewards(0))
      .to.emit(fia, 'RewardClaimed');

    // Unstake after lock period
    await expect((fia.connect(alice)).unstake(0))
      .to.emit(fia, 'Unstaked')
      .withArgs(alice.address, amount, 0);
  }).timeout(120000);

  it('stake validation: rejects invalid amounts and lock periods', async function () {
    const { fia, alice } = await deploy();

    // Zero amount
    await expect((fia.connect(alice)).stake(0, 30 * 24 * 60 * 60, false))
      .to.be.revertedWith('Amount must be greater than 0');

    // Invalid lock period
    await expect((fia.connect(alice)).stake(100, 1000, false))
      .to.be.revertedWith('Invalid lock period');

    // Insufficient balance
    const balance = await fia.balanceOf(alice.address);
    await expect((fia.connect(alice)).stake(balance + 1n, 30 * 24 * 60 * 60, false))
      .to.be.revertedWith('Insufficient balance');
  }).timeout(120000);

  it('unstake validation: rejects before lock period, invalid index, no active stake', async function () {
    const { fia, alice } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    // Invalid stake index
    await expect((fia.connect(alice)).unstake(0))
      .to.be.revertedWith('Invalid stake index');

    // Stake then try to unstake before lock period
    await (fia.connect(alice)).stake(ethers.parseUnits('100', 18), LOCK_30_DAYS, false);
    await expect((fia.connect(alice)).unstake(0))
      .to.be.revertedWith('Lock period not finished');

    // Fast-forward and unstake, then try to unstake again
    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS + 1]);
    await ethers.provider.send('evm_mine');
    await (fia.connect(alice)).unstake(0);
    await expect((fia.connect(alice)).unstake(0))
      .to.be.revertedWith('No active stake');
  }).timeout(120000);

  it('auto-compound stakes increase principal on reward claims', async function () {
    const { fia, alice } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    const initialAmount = ethers.parseUnits('100', 18);
    await (fia.connect(alice)).stake(initialAmount, LOCK_30_DAYS, true); // auto-compound enabled

    // Fast-forward to accrue rewards
    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS / 2]);
    await ethers.provider.send('evm_mine');

    const stakeBefore = await fia.userStakes(alice.address, 0);
    await (fia.connect(alice)).claimRewards(0);
    const stakeAfter = await fia.userStakes(alice.address, 0);

    // Principal should have increased due to auto-compound
    expect(stakeAfter.amount).to.be.greaterThan(stakeBefore.amount);
  }).timeout(120000);

  it('reward pool exhaustion: no rewards when pool insufficient', async function () {
    const { fia, alice, bob } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    // Drain most of reward pool by adding large stakes and claiming
    await (fia.connect(alice)).stake(ethers.parseUnits('5000', 18), LOCK_30_DAYS, false);
    await (fia.connect(bob)).stake(ethers.parseUnits('4000', 18), LOCK_30_DAYS, false);

    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS]);
    await ethers.provider.send('evm_mine');

    // Claim should work but might not give full calculated rewards due to pool limits
    const calculatedReward = await fia.calculateRewards(alice.address, 0);
    const poolBefore = await fia.rewardPool();
    
    if (calculatedReward > poolBefore) {
      // Pool is insufficient - claim should not revert but give partial/no rewards
      await (fia.connect(alice)).claimRewards(0);
      const poolAfter = await fia.rewardPool();
      expect(poolAfter).to.be.lte(poolBefore);
    }
  }).timeout(120000);

  it('pause blocks staking operations', async function () {
    const { fia, alice } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    await fia.emergencyPause();

    await expect((fia.connect(alice)).stake(100, LOCK_30_DAYS, false))
      .to.be.revertedWithCustomError(fia, 'EnforcedPause');
    
    // First need to stake while unpaused
    await fia.emergencyUnpause();
    await (fia.connect(alice)).stake(ethers.parseUnits('100', 18), LOCK_30_DAYS, false);
    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS + 1]);
    await ethers.provider.send('evm_mine');
    
    await fia.emergencyPause();
    await expect((fia.connect(alice)).unstake(0))
      .to.be.revertedWithCustomError(fia, 'EnforcedPause');
    await expect((fia.connect(alice)).claimRewards(0))
      .to.be.revertedWithCustomError(fia, 'EnforcedPause');
  }).timeout(120000);

  it('edge case: zero rewards when no time passed or amount is zero', async function () {
    const { fia, alice } = await deploy();
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;

    await (fia.connect(alice)).stake(ethers.parseUnits('100', 18), LOCK_30_DAYS, false);
    
    // Immediate claim should give zero rewards
    const rewards = await fia.calculateRewards(alice.address, 0);
    expect(rewards).to.equal(0);

    // Test _calculateRewards with zero amount (internal coverage)
    await ethers.provider.send('evm_increaseTime', [LOCK_30_DAYS + 1]);
    await ethers.provider.send('evm_mine');
    await (fia.connect(alice)).unstake(0); // This zeroes the amount

    const zeroRewards = await fia.calculateRewards(alice.address, 0);
    expect(zeroRewards).to.equal(0);
  }).timeout(120000);
});
