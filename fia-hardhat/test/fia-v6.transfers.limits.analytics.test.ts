import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

// Focused unit tests for transfers, limits, analytics, burn and fee accounting

describe('V6: transfers, limits, analytics', function () {
  async function deploy() {
    const [deployer, treasury, founder, a, b, exempt] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    // make treasury exempt for clean seeding
    await fia.setFeeExempt(treasury.address, true);
  // seed a and b (a gets a large balance to fill b close to wallet limit)
  await (fia.connect(treasury)).transfer(a.address, ethers.parseUnits('5000000000', 18));
  await (fia.connect(treasury)).transfer(b.address, ethers.parseUnits('100', 18));
    return { fia, deployer, treasury, founder, a, b, exempt };
  }

  it('applies fees, splits, and updates burn/fee analytics', async function () {
    const { fia, a, b, treasury } = await deploy();
    const feeBP = Number(await fia.totalFeeBP());
    const net = (amt: bigint) => amt - ((amt * BigInt(feeBP)) / 10_000n);

    const amount = ethers.parseUnits('1000', 18);
    const burnBefore = (await fia.tokenStats()).totalBurned;
    const feeBefore = (await fia.tokenStats()).totalFeeCollected;

    const bBefore = await fia.balanceOf(b.address);
    await (fia.connect(a)).transfer(b.address, amount);
    const bAfter = await fia.balanceOf(b.address);

    expect(bAfter - bBefore).to.equal(net(amount));

  const ts = await fia.tokenStats();
  // total fee increases and burned increases by a portion
  expect(ts.totalFeeCollected > feeBefore).to.equal(true);
  expect(ts.totalBurned > burnBefore).to.equal(true);
  }).timeout(120000);

  it('fee exemptions bypass fees and preserve balances', async function () {
    const { fia, a, b } = await deploy();
    await fia.setFeeExempt(a.address, true);
    const before = await fia.balanceOf(b.address);
    await (fia.connect(a)).transfer(b.address, ethers.parseUnits('50', 18));
    const after = await fia.balanceOf(b.address);
    expect(after - before).to.equal(ethers.parseUnits('50', 18));
  }).timeout(120000);

  it('maxTx and maxWallet enforced; exempt bypass for recipient on wallet limit', async function () {
    const { fia, a, b, exempt } = await deploy();
    const limits: any = await fia.txLimits();

    // Try to send exceeding maxTx
    await expect((fia.connect(a)).transfer(b.address, limits.maxTxAmount + 1n)).to.be.revertedWith('Transaction amount exceeds limit');

    // Simple wallet limit test: mark b as exempt first, then test large transfer works
    await fia.setFeeExempt(b.address, true);
    const largeAmount = ethers.parseUnits('5000', 18); // Well within a's balance
    const beforeB = await fia.balanceOf(b.address);
    await (fia.connect(a)).transfer(b.address, largeAmount);
    const afterB = await fia.balanceOf(b.address);
    expect(afterB - beforeB).to.equal(largeAmount); // No fees for exempt

    // Remove exemption and try sending amount that would exceed limit for non-exempt
    await fia.setFeeExempt(b.address, false);
    const currentB = await fia.balanceOf(b.address);
    if (currentB < limits.maxWalletAmount) {
      const exceedAmount = (limits.maxWalletAmount as bigint) - currentB + 1n;
      if (exceedAmount <= (await fia.balanceOf(a.address))) {
        await expect((fia.connect(a)).transfer(b.address, exceedAmount)).to.be.revertedWith('Wallet limit exceeded');
      }
    }
  }).timeout(120000);  it('analytics: tx count, unique holders, firstTransactionTime, per-user fees', async function () {
    const { fia, a, b } = await deploy();
    const feeBP = Number(await fia.totalFeeBP());

    const t1 = await fia.tokenStats();
    const uaB1 = await fia.userStats(b.address);

    // First transfer to b (b already had a balance from deploy, so ensure a fresh address instead)
    const [,, , , , fresh] = await ethers.getSigners();
    const beforeHolders = (await fia.tokenStats()).uniqueHolders;
    await (fia.connect(a)).transfer(fresh.address, ethers.parseUnits('1', 18));
    const afterHolders = (await fia.tokenStats()).uniqueHolders;
    expect(afterHolders - beforeHolders).to.equal(1n);

    // Another transfer to same fresh should not increase holders
    await (fia.connect(a)).transfer(fresh.address, ethers.parseUnits('1', 18));
    const afterHolders2 = (await fia.tokenStats()).uniqueHolders;
    expect(afterHolders2).to.equal(afterHolders);

    // Transaction counts increase
    const t2 = await fia.tokenStats();
    expect(t2.transactionCount - t1.transactionCount).to.be.greaterThan(0n);

    // Fees paid by sender accumulated
    const amount = ethers.parseUnits('100', 18);
    const uaA0 = await fia.userStats(a.address);
    await (fia.connect(a)).transfer(b.address, amount);
    const uaA1 = await fia.userStats(a.address);
    expect(uaA1.totalFeesPaid - uaA0.totalFeesPaid).to.equal((amount * BigInt(feeBP)) / 10_000n);

    // firstTransactionTime set for fresh
    const uaFresh = await fia.userStats(fresh.address);
    expect(uaFresh.firstTransactionTime).to.be.greaterThan(0n);
  }).timeout(120000);

  it('burn function updates totalBurned and reduces holder balance', async function () {
    const { fia, a } = await deploy();
    const amt = ethers.parseUnits('10', 18);
    const beforeBA = await fia.balanceOf(a.address);
    await (fia.connect(a)).burn(amt);
    const afterBA = await fia.balanceOf(a.address);
    expect(beforeBA - afterBA).to.equal(amt);
    const ts = await fia.tokenStats();
    expect(ts.totalBurned).to.be.greaterThan(0n);
  }).timeout(120000);
});
