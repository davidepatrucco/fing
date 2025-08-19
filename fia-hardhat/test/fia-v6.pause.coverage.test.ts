import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

// Ensure pause covers transfer, protectedTransfer, batchTransfer, transferWithData, addToRewardPool, burn path allowed(?), staking functions not present in v6 prototype

describe('V6 Pause coverage', function () {
  it('blocks state-changing token operations when paused', async function () {
    const [deployer, treasury, founder, a, b] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

  // Seed a funded actor, then pause
  await fia.setFeeExempt(treasury.address, true);
  await (fia.connect(treasury)).transfer(a.address, 10n);
  await fia.emergencyPause();

  await expect((fia.connect(treasury)).transfer(b.address, 1n)).to.be.revertedWithCustomError(fia, 'EnforcedPause');
  await expect((fia.connect(a)).protectedTransfer(b.address, 1n, 1)).to.be.revertedWithCustomError(fia, 'EnforcedPause');
  await expect((fia.connect(a)).batchTransfer([b.address], [1n])).to.be.revertedWithCustomError(fia, 'EnforcedPause');
  await expect((fia.connect(a)).transferWithData(b.address, 1n, new Uint8Array())).to.be.revertedWithCustomError(fia, 'EnforcedPause');

    await fia.emergencyUnpause();
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(a.address, 10n);
    await (fia.connect(a)).transfer(b.address, 1n);
  }).timeout(120000);
});
