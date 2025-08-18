import { expect } from "chai";
import { ethers } from "hardhat";

describe('FIACoin basic', function () {
  it('deploys and mints total supply to deployer', async () => {
    const [deployer] = await ethers.getSigners();
    const FIA = await ethers.getContractFactory('FIACoin');
    const fia = await FIA.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const total = await fia.totalSupply();
    const bal = await fia.balanceOf(deployer.address);
    expect(bal).to.equal(total);
  });

  it('emits Fingered on transfer', async () => {
  const [deployer, a, b] = await ethers.getSigners();
  const FIA = await ethers.getContractFactory('FIACoin');
  const fia = await FIA.deploy(deployer.address, deployer.address);
  await fia.waitForDeployment();

  // Give a some tokens
  await fia.transfer(a.address, ethers.parseUnits('1000', 18));
  const beforeA = await fia.balanceOf(a.address);
  const beforeB = await fia.balanceOf(b.address);

  // Transfer from a to b
  const fiaA = fia.connect(a);
  await fiaA.transfer(b.address, ethers.parseUnits('100', 18));

  const afterA = await fia.balanceOf(a.address);
  const afterB = await fia.balanceOf(b.address);

  expect(afterA).to.be.lt(beforeA);
  expect(afterB).to.be.gt(beforeB);
  });
});
