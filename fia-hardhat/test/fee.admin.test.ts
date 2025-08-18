import { expect } from 'chai';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('FIACoinV5 - Fee admin and timing', function () {
  it('setFeeDistribution validates sum and setTotalFeeBP respects delay', async function () {
    const [deployer, user] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');

    const fia = await FIACoinV5.deploy(deployer.address, user.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    // invalid distribution (does not equal totalFeeBP)
    await expect(fia.setFeeDistribution(10, 10, 10)).to.be.revertedWith('Distribution must equal total fee');

    // setTotalFeeBP should revert immediately because of FEE_CHANGE_DELAY
    await expect(fia.setTotalFeeBP(150)).to.be.revertedWith('Fee change too frequent');

    // fast-forward past fee change delay and then set successfully
    const delay = await fia.FEE_CHANGE_DELAY();
    await ethers.provider.send('evm_increaseTime', [Number(delay) + 1]);
    await ethers.provider.send('evm_mine');

    await fia.setTotalFeeBP(150);
    const newFee = await fia.totalFeeBP();
    expect(BigInt(newFee.toString())).to.equal(BigInt(150));
  }).timeout(200000);
});
