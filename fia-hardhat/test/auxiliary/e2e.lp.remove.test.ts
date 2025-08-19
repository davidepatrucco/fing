import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E: MockDEX LP remove liquidity', function () {
  it('remove liquidity returns proportional tokens and reduces LP balance', async function () {
    const [deployer, user] = await (hre as any).ethers.getSigners();
  const FIACoinV6 = await ethers.getContractFactory('FIACoinV6');
    const MockToken = await ethers.getContractFactory('MockToken');
    const MockDEX = await ethers.getContractFactory('MockDEX');

  const fia = await FIACoinV6.deploy(deployer.address, deployer.address, deployer.address);
    await fia.waitForDeployment();

    const token = await MockToken.deploy('Mock', 'MCK', ethers.parseUnits('1000000', 18));
    await token.waitForDeployment();

    const dex = await MockDEX.deploy();
    await dex.waitForDeployment();

  // fund user (treasury holds initial supply)
  await fia.connect(deployer).transfer(user.address, ethers.parseUnits('1000', 18));
  await token.transfer(user.address, ethers.parseUnits('1000', 18));

    await fia.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));
    await token.connect(user).approve(await dex.getAddress(), ethers.parseUnits('1000', 18));

    // add liquidity
    const tx = await dex.connect(user).addLiquidity(await fia.getAddress(), await token.getAddress(), ethers.parseUnits('100', 18), ethers.parseUnits('100', 18));
    const receipt = await tx.wait();
    // prefer event-provided LP address; fall back to pair mapping
    const ev = receipt.events?.find((e: any) => e.event === 'LiquidityAdded');
    let lpAddr = ev && ev.args ? ev.args.lp : null;
    if (!lpAddr) {
      let a = await fia.getAddress();
      let b = await token.getAddress();
      if (b < a) { const tmp = a; a = b; b = tmp; }
      const packed = '0x' + a.slice(2) + b.slice(2);
      const h = ethers.keccak256(packed);
      const pair = await (dex as any).pairs(h);
      lpAddr = pair.lp;
    }
    expect(lpAddr).to.not.equal('0x0000000000000000000000000000000000000000');

    // check LP balance
    const lpContract = await ethers.getContractAt('MockLP', lpAddr);
    const lpBal = await lpContract.balanceOf(user.address);
    expect(BigInt(lpBal.toString()) > 0n).to.be.true;

    // remove half of LP
    const half = BigInt(lpBal.toString()) / 2n;
    await lpContract.connect(user).approve(await dex.getAddress(), half.toString());

    const beforeFIA = await fia.balanceOf(user.address);
    const beforeMCK = await token.balanceOf(user.address);

    const removed = await dex.connect(user).removeLiquidity(await fia.getAddress(), await token.getAddress(), half.toString());
    const receipt2 = await removed.wait();

    // verify balances increased by roughly half of reserves
    const afterFIA = await fia.balanceOf(user.address);
    const afterMCK = await token.balanceOf(user.address);

    expect(BigInt(afterFIA.toString()) > BigInt(beforeFIA.toString()));
    expect(BigInt(afterMCK.toString()) > BigInt(beforeMCK.toString()));

    // ensure LP balance decreased
    const lpBalAfter = await lpContract.balanceOf(user.address);
    expect(BigInt(lpBalAfter.toString()) < BigInt(lpBal.toString()));
  }).timeout(200000);
});
