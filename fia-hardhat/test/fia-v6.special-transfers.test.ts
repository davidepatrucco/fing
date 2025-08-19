import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('V6: special transfers (protected, with data, batch atomicity)', function () {
  it('protectedTransfer anti-MEV: happy, nonce reuse, cooldown, independence', async function () {
    const [deployer, treasury, founder, A, B, C] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(A.address, ethers.parseUnits('1000', 18));

    // happy path
    await ethers.provider.send('evm_mine');
    await (fia.connect(A)).protectedTransfer(B.address, 1n, 1);

    // advance one block but reuse nonce => revert
    await ethers.provider.send('evm_mine');
    await expect((fia.connect(A)).protectedTransfer(B.address, 1n, 1)).to.be.revertedWith('Nonce used');

    // cooldown not met (still within 60s)
    await expect((fia.connect(A)).protectedTransfer(C.address, 1n, 3)).to.be.revertedWith('Cooldown not met');
    // advance time >= 60s
    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine');
    await (fia.connect(A)).protectedTransfer(C.address, 1n, 3);

    // independence: B can send in same block w.r.t A cooldown
    await ethers.provider.send('evm_mine');
    await (fia.connect(treasury)).transfer(B.address, 10n);
    await (fia.connect(B)).protectedTransfer(A.address, 1n, 7);
  }).timeout(120000);

  it('transferWithData emits memo hash and transfers funds for various payload sizes', async function () {
    const [deployer, treasury, founder, A, B] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(A.address, ethers.parseUnits('100', 18));

    for (const memo of [new Uint8Array(), ethers.toUtf8Bytes('x'), ethers.toUtf8Bytes('longer memo payload')]) {
      const before = await fia.balanceOf(B.address);
      const amt = 10n;
      await expect((fia.connect(A)).transferWithData(B.address, amt, memo))
        .to.emit(fia, 'TransferWithDataLite')
        .withArgs(A.address, B.address, amt, ethers.keccak256(memo));
      const after = await fia.balanceOf(B.address);
      expect(after - before).to.be.greaterThan(0n);
    }
  }).timeout(120000);

  it('batchTransfer is atomic and applies per-leg logic', async function () {
    const [deployer, treasury, founder, A, B, C, D] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    await fia.setFeeExempt(treasury.address, true);

    await (fia.connect(treasury)).transfer(A.address, ethers.parseUnits('1000', 18));

    // happy path
    const b0 = await fia.balanceOf(B.address);
    const c0 = await fia.balanceOf(C.address);
    const d0 = await fia.balanceOf(D.address);
    await (fia.connect(A)).batchTransfer([B.address, C.address, D.address], [10n, 20n, 30n]);
    const b1 = await fia.balanceOf(B.address);
    const c1 = await fia.balanceOf(C.address);
    const d1 = await fia.balanceOf(D.address);
    expect(b1 - b0).to.be.greaterThan(0n);
    expect(c1 - c0).to.be.greaterThan(0n);
    expect(d1 - d0).to.be.greaterThan(0n);

    // atomicity: one invalid leg (exceed wallet) => revert whole batch
    const limits: any = await fia.txLimits();
    // fill C to just below limit
    const toFill = (limits.maxWalletAmount as bigint) - (await fia.balanceOf(C.address));
    await (fia.connect(treasury)).transfer(C.address, toFill - 1n);
    // now any amount >= 2 should exceed
    await expect((fia.connect(A)).batchTransfer([B.address, C.address], [1n, 2n])).to.be.revertedWith('Wallet limit exceeded');
  }).timeout(120000);
});
