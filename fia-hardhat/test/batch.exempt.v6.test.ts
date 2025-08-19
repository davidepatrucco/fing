import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('FIACoinV6 - Fee exemption (single)', function () {
  it('only owner can call setFeeExempt and event emitted', async function () {
    const [deployer, attacker, treasury, founder, , safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // attacker cannot call
    await expect(fia.connect(attacker).setFeeExempt(attacker.address, true)).to.be.reverted;

    // owner can call and it sets mapping
    await expect(fia.setFeeExempt(attacker.address, true))
      .to.emit(fia, 'FeeExemptionSet')
      .withArgs(attacker.address, true);
    const exempt = await fia.isFeeExempt(attacker.address);
    expect(exempt).to.be.true;
  }).timeout(200000);
});
