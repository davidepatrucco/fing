import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E V6: 4-address transfer flows (standard, protected, with data)', function () {
  it('runs end-to-end and validates balances/fees/limits', async function () {
    const [deployer, treasury, founder, A, B, C, D] = await ethers.getSigners();

  const V6 = await ethers.getContractFactory('FIACoinV6');
  const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();
    // Make treasury fee-exempt so seeding is fee-free
    await fia.setFeeExempt(treasury.address, true);

    // Read fee config
    const totalFeeBP = Number(await fia.totalFeeBP());

  // Seed actors from treasury (which holds TOTAL_SUPPLY in V6)
  await (fia.connect(treasury)).transfer(A.address, ethers.parseUnits('20000', 18));
  await (fia.connect(treasury)).transfer(B.address, ethers.parseUnits('5000', 18));
  await (fia.connect(treasury)).transfer(C.address, ethers.parseUnits('1000', 18));
  // D starts at 0

    // Helper to compute net received after fees
    const net = (amount: bigint) => amount - ((amount * BigInt(totalFeeBP)) / 10_000n);

    // 1) Standard transfer: A -> B amountX
  const amountX = ethers.parseUnits('1000', 18);
    const beforeBA = await fia.balanceOf(B.address);
    await (fia.connect(A)).transfer(B.address, amountX);
    const afterBA = await fia.balanceOf(B.address);
    expect(afterBA - beforeBA).to.equal(net(amountX));

    // 2) Protected transfer (anti-MEV) with nonce: B -> C amountY
  const amountY = ethers.parseUnits('500', 18);
    const b = fia.connect(B);
    // ensure new block to avoid same-block check from prior senders
    await ethers.provider.send('evm_mine');
    const beforeCB = await fia.balanceOf(C.address);
    await b.protectedTransfer(C.address, amountY, 1);
    const afterCB = await fia.balanceOf(C.address);
    expect(afterCB - beforeCB).to.equal(net(amountY));
    // nonce reuse should revert
    await ethers.provider.send('evm_mine');
    await expect(b.protectedTransfer(C.address, amountY, 1)).to.be.revertedWith('Nonce used');

    // 3) Transfer with metadata: C -> D amountZ
  const amountZ = ethers.parseUnits('200', 18);
    const data = ethers.toUtf8Bytes('hello-metadata');
    const beforeDC = await fia.balanceOf(D.address);
    await expect((fia.connect(C)).transferWithData(D.address, amountZ, data))
      .to.emit(fia, 'TransferWithDataLite')
      .withArgs(C.address, D.address, amountZ, ethers.keccak256(data));
    const afterDC = await fia.balanceOf(D.address);
    expect(afterDC - beforeDC).to.equal(net(amountZ));

    // Sanity: limits should not have been breached by any single tx
    const txLimits: any = await fia.txLimits();
    expect(amountX <= txLimits.maxTxAmount).to.be.true;
    expect(amountY <= txLimits.maxTxAmount).to.be.true;
    expect(amountZ <= txLimits.maxTxAmount).to.be.true;

    // 4) Batch send from A to [B, C, D]
    const r1 = ethers.parseUnits('100', 18);
    const r2 = ethers.parseUnits('150', 18);
    const r3 = ethers.parseUnits('250', 18);
    const beforeB = await fia.balanceOf(B.address);
    const beforeC = await fia.balanceOf(C.address);
    const beforeD = await fia.balanceOf(D.address);
    await (fia.connect(A)).batchTransfer([B.address, C.address, D.address], [r1, r2, r3]);
    const afterB = await fia.balanceOf(B.address);
    const afterC = await fia.balanceOf(C.address);
    const afterD = await fia.balanceOf(D.address);

    // batch applies per-transfer fees in _update override
    expect(afterB - beforeB).to.equal(net(r1));
    expect(afterC - beforeC).to.equal(net(r2));
    expect(afterD - beforeD).to.equal(net(r3));
  }).timeout(180000);
});
