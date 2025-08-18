const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('FIACoinV5 - burn and fee distribution', function () {
  let fiaFactory;
  let deployer, user, recipient, treasury, founder;

  before(async function () {
    [deployer, user, recipient, treasury, founder] = await ethers.getSigners();
    fiaFactory = await ethers.getContractFactory('FIACoinV5');
  });

  it('burns tokens on transfer so totalSupply decreases and tokenStats.totalBurned increments', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();

    const initialTotal = await fia.totalSupply();

    // transfer some tokens from deployer to user
    const amount = ethers.parseUnits('10000', 18); // 10k
    await fia.transfer(user.address, amount);

    // user transfers to recipient to trigger fees (neither is fee-exempt)
    const userFia = fia.connect(user);
    const tx = await userFia.transfer(recipient.address, ethers.parseUnits('1000', 18));
    await tx.wait();

    const afterTotal = await fia.totalSupply();
    expect(afterTotal).to.be.lt(initialTotal);

    // tokenStats should reflect totalBurned > 0
    const stats = await fia.tokenStats();
    // Depending on solidity return shape, try both property access patterns
    const totalBurned = stats.totalBurned ?? stats[1] ?? stats[0];
    expect(BigInt(totalBurned)).to.be.gt(0n);
  });

  it('distributes fees to treasury and founder and updates analytics', async function () {
    const fia = await fiaFactory.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();

    // compute expected values for a sample transfer
    const amount = ethers.parseUnits('5000', 18); // 5k
    await fia.transfer(user.address, amount);

    // read fee params
    const totalFeeBP = await fia.totalFeeBP(); // e.g., 100 = 1%
    const feeToTreasuryBP = await fia.feeToTreasuryBP();
    const feeToFounderBP = await fia.feeToFounderBP();

  // perform transfer that will pay fees
  const transferAmount = ethers.parseUnits('1000', 18);
  const userFia = fia.connect(user);

  // snapshot balances and stats before
  const treasuryBefore = await fia.balanceOf(treasury.address);
  const founderBefore = await fia.balanceOf(founder.address);
  const statsBefore = await fia.tokenStats();
  const totalFeeCollectedBefore = statsBefore.totalFeeCollected ?? statsBefore[2] ?? statsBefore[1];
  const payerStatsBefore = await fia.userStats(user.address);

  await userFia.transfer(recipient.address, transferAmount);

  // calculate expected fee amounts for this transfer only
  const feeAmount = (BigInt(transferAmount) * BigInt(totalFeeBP)) / 10000n;
  const expectedTreasuryDelta = (feeAmount * BigInt(feeToTreasuryBP)) / BigInt(totalFeeBP);
  const expectedFounderDelta = (feeAmount * BigInt(feeToFounderBP)) / BigInt(totalFeeBP);

  // balances after
  const treasuryAfter = await fia.balanceOf(treasury.address);
  const founderAfter = await fia.balanceOf(founder.address);

  const treasuryDelta = BigInt(treasuryAfter) - BigInt(treasuryBefore);
  const founderDelta = BigInt(founderAfter) - BigInt(founderBefore);

  expect(treasuryDelta).to.equal(expectedTreasuryDelta);
  expect(founderDelta).to.equal(expectedFounderDelta);

  // analytics: totalFeeCollected and user's fees increased by feeAmount
  const statsAfter = await fia.tokenStats();
  const totalFeeCollectedAfter = statsAfter.totalFeeCollected ?? statsAfter[2] ?? statsAfter[1];
  expect(BigInt(totalFeeCollectedAfter) - BigInt(totalFeeCollectedBefore)).to.equal(feeAmount);

  const payerStatsAfter = await fia.userStats(user.address);
  const payerFeesBefore = payerStatsBefore.totalFeesPaid ?? payerStatsBefore[3] ?? payerStatsBefore[2];
  const payerFeesAfter = payerStatsAfter.totalFeesPaid ?? payerStatsAfter[3] ?? payerStatsAfter[2];
  expect(BigInt(payerFeesAfter) - BigInt(payerFeesBefore)).to.equal(feeAmount);
  });
});
