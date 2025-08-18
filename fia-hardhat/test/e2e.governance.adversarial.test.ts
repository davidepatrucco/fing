import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Governance adversarial scenarios', function () {
  it('vote buying: moving tokens mid-vote should not allow double voting', async function () {
    const [deployer, buyer, seller, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    // seller has tokens; buyer will purchase them mid-vote
    await fia.transfer(seller.address, ethers.parseUnits('2000000', 18));

    // seller creates proposal
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]);
    const s = fia.connect(seller);
    await s.propose('Fee 0.5%', 0, encoded);

    // seller votes for
    await s.vote(0, true);

    // buyer transfers tokens from seller to himself (simulate purchase)
    await fia.connect(seller).transfer(buyer.address, ethers.parseUnits('1500000', 18));

    // buyer attempts to vote (should have voting power now)
    const b = fia.connect(buyer);
    await b.vote(0, false);

    // ensure seller cannot vote again
    await expect(s.vote(0, false)).to.be.revertedWith('Already voted');
  });
});
