import { expect } from "chai";
import hre from "hardhat";
const ethers = (hre as any).ethers;

describe('FIACoinV6 basic', function () {
  it('deploys and mints TOTAL_SUPPLY to treasury', async () => {
    const [deployer, treasury, founder, , , safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    const total = await fia.totalSupply();
    const balTreasury = await fia.balanceOf(treasury.address);
    expect(balTreasury).to.equal(total);
  });

  it('transfers tokens and updates balances (Fingered event emitted)', async () => {
    const [deployer, treasury, founder, a, b, safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // Make treasury fee-exempt for clean seeding
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(a.address, ethers.parseUnits('1000', 18));

    const beforeA = await fia.balanceOf(a.address);
    const beforeB = await fia.balanceOf(b.address);

    // Transfer from a to b
    await (fia.connect(a)).transfer(b.address, ethers.parseUnits('100', 18));

    const afterA = await fia.balanceOf(a.address);
    const afterB = await fia.balanceOf(b.address);

    expect(afterA).to.be.lt(beforeA);
    expect(afterB).to.be.gt(beforeB);
  });
});
