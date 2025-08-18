import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('FIACoinV5 - burn and fee distribution (ts)', function () {
  let fiaFactory: any;
  let deployer: any, user: any, recipient: any, treasury: any, founder: any;

  before(async function () {
    [deployer, user, recipient, treasury, founder] = await ethers.getSigners();
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  it('burns tokens on transfer so totalSupply decreases and tokenStats.totalBurned increments', async function () {
  const fia = await fiaFactory.deploy(treasury.address, founder.address);
  await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

    const initialTotal = await fia.totalSupply();

    // transfer some tokens from deployer to user
    const amount = ethers.parseUnits('10000', 18); // 10k
    await fia.transfer(user.address, amount);

    // user transfers to recipient to trigger fees (neither is fee-exempt)
    const userFia = fia.connect(user);
    await userFia.transfer(recipient.address, ethers.parseUnits('1000', 18));

    const afterTotal = await fia.totalSupply();
  expect(afterTotal).to.be.lt(initialTotal);

    const stats = await fia.tokenStats();
    const totalBurned = stats.totalBurned ?? stats[1] ?? stats[0];
  expect(BigInt(totalBurned.toString()) > 0n).to.be.true;
  });

  it('distributes fees to treasury and founder and updates analytics', async function () {
  const fia = await fiaFactory.deploy(treasury.address, founder.address);
  await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);

  // transfer to user to set up payer
  await fia.transfer(user.address, ethers.parseUnits('5000', 18));

    const totalFeeBP = await fia.totalFeeBP();
    const feeToTreasuryBP = await fia.feeToTreasuryBP();
    const feeToFounderBP = await fia.feeToFounderBP();

    const transferAmount = ethers.parseUnits('1000', 18);
    const userFia = fia.connect(user);

    const treasuryBefore = await fia.balanceOf(treasury.address);
    const founderBefore = await fia.balanceOf(founder.address);
    const statsBefore = await fia.tokenStats();
    const totalFeeCollectedBefore = statsBefore.totalFeeCollected ?? statsBefore[2] ?? statsBefore[1];
    const payerStatsBefore = await fia.userStats(user.address);

    await userFia.transfer(recipient.address, transferAmount);

    const feeAmount = (BigInt(transferAmount) * BigInt(totalFeeBP)) / 10000n;
    const expectedTreasuryDelta = (feeAmount * BigInt(feeToTreasuryBP)) / BigInt(totalFeeBP);
    const expectedFounderDelta = (feeAmount * BigInt(feeToFounderBP)) / BigInt(totalFeeBP);

    const treasuryAfter = await fia.balanceOf(treasury.address);
    const founderAfter = await fia.balanceOf(founder.address);

    expect(BigInt(treasuryAfter) - BigInt(treasuryBefore)).to.equal(expectedTreasuryDelta);
    expect(BigInt(founderAfter) - BigInt(founderBefore)).to.equal(expectedFounderDelta);

    const statsAfter = await fia.tokenStats();
    const totalFeeCollectedAfter = statsAfter.totalFeeCollected ?? statsAfter[2] ?? statsAfter[1];
    expect(BigInt(totalFeeCollectedAfter) - BigInt(totalFeeCollectedBefore)).to.equal(feeAmount);

    const payerStatsAfter = await fia.userStats(user.address);
    const payerFeesBefore = payerStatsBefore.totalFeesPaid ?? payerStatsBefore[3] ?? payerStatsBefore[2];
    const payerFeesAfter = payerStatsAfter.totalFeesPaid ?? payerStatsAfter[3] ?? payerStatsAfter[2];
    expect(BigInt(payerFeesAfter) - BigInt(payerFeesBefore)).to.equal(feeAmount);
  });
});
