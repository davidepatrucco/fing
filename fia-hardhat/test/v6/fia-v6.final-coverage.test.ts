import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('V6: Final coverage - mint path', function () {
  it('mint path in _update emits Fingered event', async function () {
    const [deployer, treasury, founder, alice] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

    // Use regularMint to trigger the regular mint path in _update (not during initialization)
    const mintAmount = ethers.parseUnits('100', 18);
    await expect(fia.regularMint(alice.address, mintAmount))
      .to.emit(fia, 'Fingered')
      .withArgs(ethers.ZeroAddress, alice.address, mintAmount);

    expect(await fia.balanceOf(alice.address)).to.equal(mintAmount);
  }).timeout(120000);

  it('mint to zero address path (edge case)', async function () {
    const [deployer, treasury, founder] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

    // This should revert at the ERC20 level, but if it didn't,
    // the mint path would not emit Fingered since to == address(0)
    await expect(fia.ownerMintForTests(ethers.ZeroAddress, 100))
      .to.be.revertedWithCustomError(fia, 'ERC20InvalidReceiver');
  }).timeout(120000);

  it('limits inactive path (requires contract modification or special case)', async function () {
    const [deployer, treasury, founder, alice, bob] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

    // In current implementation, limits are always active. 
    // The only way to test limitsActive == false would be if we could modify it
    // For now, test the exempt path which bypasses limit checks
    await fia.setFeeExempt(treasury.address, true);
    await fia.setFeeExempt(alice.address, true);
    
    // Transfer from treasury (exempt) to alice (exempt) - this exercises fee exempt paths
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('1000', 18));
    
    // Large transfer from exempt user that would normally hit limits
    const limits: any = await fia.txLimits();
    const largeAmount = (limits.maxTxAmount as bigint) + 1n;
    if (largeAmount <= (await fia.balanceOf(alice.address))) {
      await (fia.connect(alice)).transfer(bob.address, largeAmount);
    }
  }).timeout(120000);
});
