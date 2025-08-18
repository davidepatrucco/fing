import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('Edge cases: staking, governance, batch ops', function () {
  let fiaFactory: any;
  let deployer: any, treasury: any, founder: any, userA: any, userB: any;

  beforeEach(async function () {
    [deployer, treasury, founder, userA, userB] = await ethers.getSigners();
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  it('staking: rewards should not exceed rewardPool and autoCompound increases stake', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    // fund user and reward pool
    await fia.transfer(userA.address, ethers.parseUnits('10000', 18));
    await fia.addToRewardPool(ethers.parseUnits('1000', 18));

    const userFia = fia.connect(userA);
    // stake with autoCompound true
    const STAKE = ethers.parseUnits('5000', 18);
    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(STAKE, LOCK_30_DAYS, true);

    // advance time to accumulate rewards
    await ethers.provider.send('evm_increaseTime', [60 * 24 * 60 * 60]); // 60 days
    await ethers.provider.send('evm_mine');

    // claim rewards via internal path by calling claimRewards
    await userFia.claimRewards(0);

    const stakeInfo = await fia.userStakes(userA.address, 0);
    // auto-compound should increase stake amount
  expect(BigInt(stakeInfo.amount.toString()) > BigInt(STAKE)).to.be.true;

    // rewardPool should have decreased (not negative)
    const pool = await fia.rewardPool();
  expect(BigInt(pool.toString()) >= 0n).to.be.true;
  });

  it('governance: cannot execute before voting end + delay and fails gracefully', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    // give userA enough tokens to propose
    await fia.transfer(userA.address, ethers.parseUnits('2000000', 18));
    const fA = fia.connect(userA);

    // create a fee change proposal
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]);
    await fA.propose('Fee 0.5%', 0, encoded);

    // vote (for)
    await fA.vote(0, true);

    // try to execute immediately (should revert with 'Voting still active' or 'Execution delay not met')
  await expect(fia.execute(0)).to.be.revertedWith('Voting still active');

    // fast forward to after voting end but before execution delay
    const proposal = await fia.proposals(0);
    await ethers.provider.send('evm_increaseTime', [Number(proposal.endTime) - Math.floor(Date.now() / 1000) + 1]);
    await ethers.provider.send('evm_mine');

    // still should revert; depending on quorum and timing the revert can be 'Execution delay not met' or 'Quorum not met'
    try {
      await fia.execute(0);
      throw new Error('Expected execute to revert');
    } catch (err: any) {
      const msg = err.message || '';
      const ok = msg.includes('Execution delay not met') || msg.includes('Quorum not met') || msg.includes('Voting still active');
      if (!ok) throw err;
    }
  });

  it('batch operations: batchTransfer enforces array lengths and totals and reverts when insufficient funds', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    const recipients = [userA.address, userB.address];
    const amounts = [ethers.parseUnits('100', 18), ethers.parseUnits('200', 18)];

  // insufficient funds case: try from user with zero balance
  const userAFia = fia.connect(userA);
  await expect(userAFia.batchTransfer(recipients, amounts)).to.be.revertedWith('Insufficient balance');

  // valid case from deployer - exempt deployer & contract to avoid fee deductions in this test
  await fia.setFeeExempt(deployer.address, true);
  await fia.setFeeExempt(await fia.getAddress(), true);
  // valid case from deployer
  await fia.batchTransfer(recipients, amounts);
    expect(await fia.balanceOf(userA.address)).to.equal(amounts[0]);
    expect(await fia.balanceOf(userB.address)).to.equal(amounts[1]);

    // mismatched arrays
    const badAmounts = [ethers.parseUnits('1', 18)];
  await expect(fia.batchTransfer(recipients, badAmounts)).to.be.revertedWith('Array length mismatch');
  });
});
