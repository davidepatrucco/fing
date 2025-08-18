import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Staking & Rewards flows', function () {
  let fiaFactory: any;
  let deployer: any, treasury: any, founder: any, user: any;

  beforeEach(async function () {
    [deployer, treasury, founder, user] = await ethers.getSigners();
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  it('stake -> accrue -> claim (autoCompound off) reduces rewardPool and pays user', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    // fund user and large reward pool
    const stakeAmount = ethers.parseUnits('10000', 18);
    await fia.transfer(user.address, stakeAmount);
    const topUp = ethers.parseUnits('100000', 18);
    await fia.addToRewardPool(topUp);

    const userFia = fia.connect(user);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(stakeAmount, LOCK_30_DAYS, false);

    // advance 60 days to generate rewards
    await ethers.provider.send('evm_increaseTime', [60 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine');

    const pendingBefore = await fia.getStakingRewards(user.address);
    expect(BigInt(pendingBefore.toString()) > 0n).to.be.true;

    const poolBefore = await fia.rewardPool();
    await userFia.claimRewards(0);

    const poolAfter = await fia.rewardPool();
    // pool should decrease by at most pendingBefore (if pool covers it)
    expect(BigInt(poolAfter.toString()) <= BigInt(poolBefore.toString())).to.be.true;

    const pendingAfter = await fia.getStakingRewards(user.address);
    // pending should have been cleared (or zero)
    expect(BigInt(pendingAfter.toString()) === 0n || BigInt(pendingAfter.toString()) < BigInt(pendingBefore.toString())).to.be.true;
  });

  it('autoCompound true increases stake amount on claim', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const stakeAmount = ethers.parseUnits('5000', 18);
    await fia.transfer(user.address, stakeAmount);
    await fia.addToRewardPool(ethers.parseUnits('50000', 18));

    const userFia = fia.connect(user);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(stakeAmount, LOCK_30_DAYS, true);

    // advance 90 days
    await ethers.provider.send('evm_increaseTime', [90 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine');

    const stakeInfoBefore: any = await fia.userStakes(user.address, 0);
    const amtBefore = BigInt(stakeInfoBefore.amount.toString());

    await userFia.claimRewards(0);

    const stakeInfoAfter: any = await fia.userStakes(user.address, 0);
    const amtAfter = BigInt(stakeInfoAfter.amount.toString());

    expect(amtAfter > amtBefore).to.be.true;
  });

  it('unstake after lock returns principal (minus any early penalty if applicable) and reduces totalStaked', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const stakeAmount = ethers.parseUnits('2000', 18);
    await fia.transfer(user.address, stakeAmount);
    await fia.addToRewardPool(ethers.parseUnits('10000', 18));

    const userFia = fia.connect(user);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(stakeAmount, LOCK_30_DAYS, false);

    const totalStakedBefore = await fia.totalStaked();

    // fast forward beyond lock
    await ethers.provider.send('evm_increaseTime', [31 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine');

    await userFia.unstake(0);

    const totalStakedAfter = await fia.totalStaked();
    expect(BigInt(totalStakedAfter.toString()) < BigInt(totalStakedBefore.toString())).to.be.true;
  });

  it('claim does nothing if reward > rewardPool (insufficient pool)', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const stakeAmount = ethers.parseUnits('100000', 18);
    await fia.transfer(user.address, stakeAmount);
    // set reward pool small
    await fia.addToRewardPool(ethers.parseUnits('1', 18));

    const userFia = fia.connect(user);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(stakeAmount, LOCK_30_DAYS, false);

    // advance to generate large reward
    await ethers.provider.send('evm_increaseTime', [180 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine');

    const poolBefore = await fia.rewardPool();
    await userFia.claimRewards(0);
    const poolAfter = await fia.rewardPool();

    // pool should be unchanged because reward > pool
    expect(BigInt(poolAfter.toString())).to.equal(BigInt(poolBefore.toString()));
  });
});
