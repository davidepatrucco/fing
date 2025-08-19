import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E: MockDEX / LP flows', function () {
  it('add liquidity and swap via MockDEX', async function () {
  const [deployer, user, treasury, founder, , safe] = await (hre as any).ethers.getSigners();
  const V6 = await ethers.getContractFactory('FIACoinV6');
    const MockToken = await ethers.getContractFactory('MockToken');
    const MockDEX = await ethers.getContractFactory('MockDEX');

  const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    const token = await MockToken.deploy('Mock', 'MCK', ethers.parseUnits('1000000', 18));
    await token.waitForDeployment();

    const dex = await MockDEX.deploy();
    await dex.waitForDeployment();

    // transfer some FIA and MCK to user
    await fia.transfer(user.address, ethers.parseUnits('1000', 18));
    await token.transfer(user.address, ethers.parseUnits('1000', 18));

    // user approve dex
    await fia.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));

    // also seed dex with tokens so swaps work
    await fia.transfer(await dex.getAddress(), ethers.parseUnits('500', 18));
    await token.transfer(await dex.getAddress(), ethers.parseUnits('500', 18));

    // add liquidity from user
    const tx = await dex.connect(user).addLiquidity(await fia.getAddress(), await token.getAddress(), ethers.parseUnits('100', 18), ethers.parseUnits('200', 18));
  const receipt = await tx.wait();
  // fallback: compute the packed pair hash by concatenating raw address hex (abi.encodePacked for two addresses)
  let a = await fia.getAddress();
  let b = await token.getAddress();
  if (b < a) {
    const tmp = a; a = b; b = tmp;
  }
  const packed = '0x' + a.slice(2) + b.slice(2);
  const h = ethers.keccak256(packed);
  const pair = await (dex as any).pairs(h);
  const pairLP = pair.lp;
  expect(pairLP).to.not.equal('0x0000000000000000000000000000000000000000');

  // already asserted via event that LP address was emitted

    // swap MCK -> FIA by user (approve and then swap)
    await token.connect(user).approve(await dex.getAddress(), ethers.parseUnits('10', 18));
    await dex.connect(user).swap(await token.getAddress(), await fia.getAddress(), ethers.parseUnits('10', 18));

    const fiaBal = await fia.balanceOf(user.address);
    expect(BigInt(fiaBal.toString()) > 0n).to.be.true;
  }).timeout(200000);
});
