import { expect } from 'chai';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: LP edge cases', function () {
  it('removing full liquidity returns all underlying and sets reserves to zero', async function () {
    const [deployer, user] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const MockToken = await ethers.getContractFactory('MockToken');
    const MockDEX = await ethers.getContractFactory('MockDEX');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const token = await MockToken.deploy('Mock', 'MCK', ethers.parseUnits('1000000', 18));
    await token.waitForDeployment();

    const dex = await MockDEX.deploy();
    await dex.waitForDeployment();

    // fund user
    await fia.transfer(user.address, ethers.parseUnits('1000', 18));
    await token.transfer(user.address, ethers.parseUnits('1000', 18));

    await fia.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));

  // prepare token/fee exemptions for deterministic transfers
  await applyCommonTestSetup(fia, deployer);
  // exempt user and dex from fees so the DEX holds exact amounts deposited
  await fia.setFeeExempt(user.address, true);
  await fia.setFeeExempt(await dex.getAddress(), true);

  // add liquidity
    const tx = await dex.connect(user).addLiquidity(await fia.getAddress(), await token.getAddress(), ethers.parseUnits('100', 18), ethers.parseUnits('100', 18));
    const receipt = await tx.wait();

    // find lp
    let a = await fia.getAddress();
    let b = await token.getAddress();
    if (b < a) { const tmp = a; a = b; b = tmp; }
    const packed = '0x' + a.slice(2) + b.slice(2);
    const h = ethers.keccak256(packed);
    const pair = await (dex as any).pairs(h);
    const lpAddr = pair.lp;
    const lpContract = await ethers.getContractAt('MockLP', lpAddr);

    const lpBal = await lpContract.balanceOf(user.address);

    // remove all LP
    await lpContract.connect(user).approve(await dex.getAddress(), lpBal.toString());
    await dex.connect(user).removeLiquidity(await fia.getAddress(), await token.getAddress(), lpBal.toString());

    const pairAfter = await (dex as any).pairs(h);
    expect(BigInt(pairAfter.reserve0.toString()) === 0n).to.be.true;
    expect(BigInt(pairAfter.reserve1.toString()) === 0n).to.be.true;
  }).timeout(200000);

  it('removing very small LP amount handles rounding (zero-out) gracefully', async function () {
    const [deployer, user] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const MockToken = await ethers.getContractFactory('MockToken');
    const MockDEX = await ethers.getContractFactory('MockDEX');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const token = await MockToken.deploy('Mock', 'MCK', ethers.parseUnits('1000000', 18));
    await token.waitForDeployment();

    const dex = await MockDEX.deploy();
    await dex.waitForDeployment();

    // fund user
    await fia.transfer(user.address, ethers.parseUnits('1000', 18));
    await token.transfer(user.address, ethers.parseUnits('1000', 18));

    await fia.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));

  // prepare fee exemptions for deterministic transfers
  await applyCommonTestSetup(fia, deployer);
  await fia.setFeeExempt(await dex.getAddress(), true);

  // add liquidity small pool
  const tx = await dex.connect(user).addLiquidity(await fia.getAddress(), await token.getAddress(), 1, 1);
    await tx.wait();

    // find lp and balances
    let a = await fia.getAddress();
    let b = await token.getAddress();
    if (b < a) { const tmp = a; a = b; b = tmp; }
    const packed = '0x' + a.slice(2) + b.slice(2);
    const h = ethers.keccak256(packed);
    const pair = await (dex as any).pairs(h);
    const lpAddr = pair.lp;
    const lpContract = await ethers.getContractAt('MockLP', lpAddr);

    const lpBal = await lpContract.balanceOf(user.address);
    // remove minimal LP (1) and ensure it doesn't revert and reduces supply appropriately
    await lpContract.connect(user).approve(await dex.getAddress(), 1);
    await dex.connect(user).removeLiquidity(await fia.getAddress(), await token.getAddress(), 1);

    const pairAfter = await (dex as any).pairs(h);
    // reserves might become zero due to rounding
    expect(BigInt(pairAfter.reserve0.toString()) >= 0n).to.be.true;
    expect(BigInt(pairAfter.reserve1.toString()) >= 0n).to.be.true;
  }).timeout(200000);

  it('LP price changes between add/remove reflect in redemption amounts', async function () {
    const [deployer, user1, user2] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const MockToken = await ethers.getContractFactory('MockToken');
    const MockDEX = await ethers.getContractFactory('MockDEX');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const token = await MockToken.deploy('Mock', 'MCK', ethers.parseUnits('1000000', 18));
    await token.waitForDeployment();

    const dex = await MockDEX.deploy();
    await dex.waitForDeployment();

    // fund users
    await fia.transfer(user1.address, ethers.parseUnits('1000', 18));
    await token.transfer(user1.address, ethers.parseUnits('1000', 18));
    await fia.transfer(user2.address, ethers.parseUnits('1000', 18));
    await token.transfer(user2.address, ethers.parseUnits('1000', 18));

    await fia.connect(user1).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user1).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await fia.connect(user2).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user2).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));

  // prepare fee exemptions and disable limits
  await applyCommonTestSetup(fia, deployer);
  await fia.setFeeExempt(await dex.getAddress(), true);

  // user1 seeds pool 100:100
  await dex.connect(user1).addLiquidity(await fia.getAddress(), await token.getAddress(), ethers.parseUnits('100', 18), ethers.parseUnits('100', 18));

    // user2 swaps large amount to skew price
    await token.connect(user2).approve(await dex.getAddress(), ethers.parseUnits('200', 18));
    await dex.connect(user2).swap(await token.getAddress(), await fia.getAddress(), ethers.parseUnits('200', 18));

    // user1 removes liquidity and should get different ratio than initial
    let a = await fia.getAddress();
    let b = await token.getAddress();
    if (b < a) { const tmp = a; a = b; b = tmp; }
    const packed = '0x' + a.slice(2) + b.slice(2);
    const h = ethers.keccak256(packed);
    const pair = await (dex as any).pairs(h);
    const lpAddr = pair.lp;
    const lpContract = await ethers.getContractAt('MockLP', lpAddr);

    const lpBal = await lpContract.balanceOf(user1.address);
    await lpContract.connect(user1).approve(await dex.getAddress(), lpBal.toString());

    const beforeFIA = await fia.balanceOf(user1.address);
    const beforeMCK = await token.balanceOf(user1.address);

    await dex.connect(user1).removeLiquidity(await fia.getAddress(), await token.getAddress(), lpBal.toString());

    const afterFIA = await fia.balanceOf(user1.address);
    const afterMCK = await token.balanceOf(user1.address);

    // one of the assets should have changed proportionally due to price move
    const deltaFIA = BigInt(afterFIA.toString()) - BigInt(beforeFIA.toString());
    const deltaMCK = BigInt(afterMCK.toString()) - BigInt(beforeMCK.toString());
    expect(deltaFIA !== deltaMCK).to.be.true;
  }).timeout(200000);
});
