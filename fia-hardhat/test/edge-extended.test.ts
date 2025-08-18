import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('Edge extended: large staking rewards, governance quorum/tie, batchTransfer gas', function () {
  let fiaFactory: any;
  let deployer: any, treasury: any, founder: any, voterA: any, voterB: any;

  beforeEach(async function () {
    [deployer, treasury, founder, voterA, voterB] = await ethers.getSigners();
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  it('staking: when reward > rewardPool claim does nothing; when pool sufficient, reward paid (autoCompound off)', async function () {
  const fia = await fiaFactory.deploy(treasury.address, founder.address);
  await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    // transfer large amount to voterA and stake almost all
    const totalSupply = await fia.totalSupply();
    const bigStake = totalSupply / 4n; // 25% of supply
    await fia.transfer(voterA.address, bigStake);

    const userFia = fia.connect(voterA);

    // set rewardPool very small so reward will be > pool
    await fia.addToRewardPool(ethers.parseUnits('1', 18));

    const LOCK_30_DAYS = 30 * 24 * 60 * 60;
    await userFia.stake(bigStake, LOCK_30_DAYS, false);

    // advance time long enough to generate a reward greater than pool
    await ethers.provider.send('evm_increaseTime', [180 * 24 * 60 * 60]); // 180 days
    await ethers.provider.send('evm_mine');

    // claim rewards: should do nothing because reward > rewardPool
    await userFia.claimRewards(0);

    const poolAfter = await fia.rewardPool();
    expect(BigInt(poolAfter)).to.equal(ethers.parseUnits('1', 18));

    // now top up reward pool to be sufficient
  // top up reward pool by a large fixed amount (10% of total supply) to ensure sufficiency
  const totalSupplyNow = await fia.totalSupply();
  const topUp = BigInt(totalSupplyNow.toString()) / 10n;
  await fia.addToRewardPool(topUp.toString());

    // claim again
    await userFia.claimRewards(0);

  // rewardPool decreased (some reward paid) compared to previous pool + topUp
  const poolFinal = await fia.rewardPool();
  const prevPool = BigInt(poolAfter.toString());
  // rewardPool should have decreased after successful claim
  expect(BigInt(poolFinal.toString()) < (prevPool + BigInt(topUp))).to.be.true;
  });

  it('governance: tied votes that meet quorum should cause proposal to be rejected at execute', async function () {
  const fia = await fiaFactory.deploy(treasury.address, founder.address);
  await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    // compute quorum = totalSupply * QUORUM_PERCENTAGE / 100
    const totalSupply = await fia.totalSupply();
    const QUORUM_PERCENTAGE = 10n;
    const quorum = (BigInt(totalSupply) * QUORUM_PERCENTAGE) / 100n;

  // split quorum into two equal voters
  const half = quorum / 2n;

  // transfer half to voterA and half to voterB
  await fia.transfer(voterA.address, half);
  await fia.transfer(voterB.address, half);

  // use deployer as proposer (deployer has sufficient balance by default)
  const proposer = fia.connect(deployer);
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]);
  await proposer.propose('Fee 0.5%', 0, encoded);

  // both vote: A for, B against
  const fA = fia.connect(voterA);
  await fA.vote(0, true);
  const fB = fia.connect(voterB);
  await fB.vote(0, false);

    // fast forward past voting end and execution delay
    const proposal = await fia.proposals(0);
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const waitTo = Number(proposal.endTime) - Number(now) + 1 + 48 * 3600 + 1; // endTime + EXECUTION_DELAY + 1
    await ethers.provider.send('evm_increaseTime', [waitTo]);
    await ethers.provider.send('evm_mine');

    // executing should revert with 'Proposal rejected'
  await expect(fia.execute(0)).to.be.revertedWith('Proposal rejected');
  });

  it('batchTransfer: many recipients should complete and gasUsed should be reasonable', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();

    // create 200 recipients
    const count = 200;
    const recipients: string[] = [];
    const amounts: any[] = [];
    for (let i = 0; i < count; i++) {
      recipients.push(ethers.Wallet.createRandom().address);
      amounts.push(ethers.parseUnits('1', 18));
    }

    // exempt deployer & contract to avoid fees
    await fia.setFeeExempt(await fia.getAddress(), true);
    await fia.setFeeExempt(deployer.address, true);

    const tx = await fia.batchTransfer(recipients, amounts);
    const receipt = await tx.wait();
    const gasUsed = BigInt(receipt.gasUsed.toString());

    // basic assertions
  expect(BigInt(gasUsed) > 0n).to.be.true;
  // assert gasUsed below a high threshold (30M)
  expect(BigInt(gasUsed) < 30000000n).to.be.true;
  });
});
