import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E: SimpleMultiSig edge cases', function () {
  it('duplicate confirmations and replay prevention', async function () {
    const [deployer, alice, bob, target] = await (hre as any).ethers.getSigners();
    const SimpleMultiSig = await ethers.getContractFactory('SimpleMultiSig');
    const FailingTarget = await ethers.getContractFactory('FailingTarget');

    const owners = [deployer.address, alice.address, bob.address];
    const multisig = await SimpleMultiSig.deploy(owners, 2);
    await multisig.waitForDeployment();

    const failing = await FailingTarget.deploy();
    await failing.waitForDeployment();

    // submit transaction to call doSomething() on failing target
    const iface = new ethers.Interface(["function doSomething()"]);
    const data = iface.encodeFunctionData('doSomething', []);

  await multisig.submitTransaction(await failing.getAddress(), 0, data);
    // duplicate confirmation by deployer should revert (already auto-confirmed in submit)
    await expect(multisig.confirmTransaction(0)).to.be.revertedWith('Already confirmed');

    // confirm by alice and execute
    await multisig.connect(alice).confirmTransaction(0);
    await multisig.executeTransaction(0);

    // replay: executing again should revert (Already executed)
    await expect(multisig.executeTransaction(0)).to.be.revertedWith('Already executed');
  }).timeout(200000);

  it('failed execution bubbles up revert from target', async function () {
    const [deployer, alice, bob] = await (hre as any).ethers.getSigners();
    const SimpleMultiSig = await ethers.getContractFactory('SimpleMultiSig');
    const FailingTarget = await ethers.getContractFactory('FailingTarget');

    const owners = [deployer.address, alice.address, bob.address];
    const multisig = await SimpleMultiSig.deploy(owners, 2);
    await multisig.waitForDeployment();

    const failing = await FailingTarget.deploy();
    await failing.waitForDeployment();

    // submit tx to call willRevert() on failing target
    const iface = new ethers.Interface(["function willRevert()"]);
    const data = iface.encodeFunctionData('willRevert', []);

  await multisig.submitTransaction(await failing.getAddress(), 0, data);
    await multisig.connect(alice).confirmTransaction(0);

    // execute should revert with Execution failed since target reverts
    await expect(multisig.executeTransaction(0)).to.be.revertedWith('Execution failed');
  }).timeout(200000);
});
