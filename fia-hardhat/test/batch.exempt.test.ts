import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('FIACoinV5 - Batch fee exemption', function () {
  it('only owner can call batchSetFeeExempt and events emitted', async function () {
    const [deployer, attacker] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const accounts = [attacker.address];

    // attacker cannot call
    await expect(fia.connect(attacker).batchSetFeeExempt(accounts, true)).to.be.reverted;

    // owner can call and it sets mapping
    await expect(fia.batchSetFeeExempt(accounts, true)).to.emit(fia, 'FeeExemptionSet').withArgs(attacker.address, true);
    const exempt = await fia.isFeeExempt(attacker.address);
    expect(exempt).to.be.true;
  }).timeout(200000);
});
