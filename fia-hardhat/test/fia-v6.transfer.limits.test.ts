import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('FIACoinV6 - Plain transfer limits (maxTx & maxWallet)', function () {
  it('reverts when amount exceeds maxTx and when recipient would exceed maxWallet', async function () {
    const [deployer, treasury, founder, alice, bob] = await ethers.getSigners();

  const V6 = await ethers.getContractFactory('FIACoinV6');
  const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
  await fia.waitForDeployment();
  // Make treasury fee-exempt so seeding is fee-free
  await fia.setFeeExempt(treasury.address, true);
  // Read on-chain limits (active by default)
  const limits: any = await fia.txLimits();
  const maxTx: bigint = limits.maxTxAmount;
  const maxWallet: bigint = limits.maxWalletAmount;
  // Seed from treasury (treasury holds TOTAL_SUPPLY)
  await (fia.connect(treasury)).transfer(alice.address, maxTx + 1000n);
  await (fia.connect(treasury)).transfer(bob.address, maxWallet - 10n);

    const a = fia.connect(alice);

    // 1) Exceed maxTx with a standard ERC20 transfer
  const overMaxTx = maxTx + 1n;
    await expect(a.transfer(bob.address, overMaxTx)).to.be.revertedWith('Transaction amount exceeds limit');

    // 2) Exceed recipient maxWallet (uses raw value before fee deduction)
  const pushOverWallet = 20n; // (maxWallet - 10) + 20 > maxWallet
    await expect(a.transfer(bob.address, pushOverWallet)).to.be.revertedWith('Wallet limit exceeded');
  }).timeout(120000);
});
