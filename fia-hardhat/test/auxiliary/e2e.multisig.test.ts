import { expect } from 'chai';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E: SimpleMultiSig admin flows', function () {
  it('transfer ownership to multisig and execute owner-only call via multisig', async function () {
    const [deployer, alice, bob, target] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const SimpleMultiSig = await ethers.getContractFactory('SimpleMultiSig');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

    const owners = [deployer.address, alice.address, bob.address];
    const multisig = await SimpleMultiSig.deploy(owners, 2);
    await multisig.waitForDeployment();

    // transfer ownership of FIA to multisig
    await fia.transferOwnership(await multisig.getAddress());

    // prepare data for setFeeExempt(target, true)
    const iface = new ethers.Interface(["function setFeeExempt(address,bool)"]);
    const data = iface.encodeFunctionData('setFeeExempt', [target.address, true]);

    // submit tx by deployer (owner of multisig)
    const txId = await (await multisig.submitTransaction(await fia.getAddress(), 0, data)).wait();
    // extract txId from event - simpler: transactions array index 0

    // confirm by alice
    await multisig.connect(alice).confirmTransaction(0);

    // execute
    await multisig.executeTransaction(0);

    const exempt = await fia.isFeeExempt(target.address);
    expect(exempt).to.be.true;
  }).timeout(200000);
});
