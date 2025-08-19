import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('V6 Governance negative branches', function () {
  it('rejects invalid proposal IDs, double voting, post-end voting, and rejected majority', async function () {
    const [deployer, treasury, founder, alice, safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();
    await fia.setFeeExempt(treasury.address, true);

    // invalid proposal id
    await expect(fia.vote(12345, true)).to.be.revertedWith('Invalid proposal ID');

    // create a proposal via test helper
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [80]);
    const pid = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Fee 0.8%', 0, data);
    await (await fia.ownerCreateProposalForTests(deployer.address, 'Fee 0.8%', 0, data)).wait();

    // double vote protection
    await (fia.connect(treasury)).vote(Number(pid), false);
    await expect((fia.connect(treasury)).vote(Number(pid), true)).to.be.revertedWith('Already voted');

    // post-end voting
    await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');
    await expect((fia.connect(alice)).vote(Number(pid), true)).to.be.revertedWith('Voting period ended');

    // Rejected majority case: against > for
    // Create another proposal and cast against with treasury
    const data2 = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [70]);
    const pid2 = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Fee 0.7%', 0, data2);
    await (await fia.ownerCreateProposalForTests(deployer.address, 'Fee 0.7%', 0, data2)).wait();
    await (fia.connect(treasury)).vote(Number(pid2), false);

    // Fast-forward past end + delay and meet quorum by minting voting power to deployer to vote for but less than treasury
    // Use mint-for-tests to give deployer some voting power but not exceeding treasury
    await fia.ownerMintForTests(deployer.address, ethers.parseUnits('1000000', 18));
    await (fia.connect(deployer)).vote(Number(pid2), true);
    await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 48 * 60 * 60 + 2]);
    await ethers.provider.send('evm_mine');
    await expect(fia.execute(Number(pid2))).to.be.revertedWith('Proposal rejected');
  }).timeout(180000);
});
