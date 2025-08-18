import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Governance timing and execution', function () {
  it('vote -> early execute -> delayed execute flow', async function () {
    const [deployer, alice, bob, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    // give voters quorum weight
    const totalSupply = BigInt((await fia.totalSupply()).toString());
    const quorum = (totalSupply * 10n) / 100n;
    const half = quorum / 2n;
    await fia.transfer(alice.address, half.toString());
    await fia.transfer(bob.address, half.toString());

    // proposer deployer creates proposal
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]);
    await fia.propose('Fee to 0.5%', 0, encoded);

    // both vote
    const a = fia.connect(alice);
    const b = fia.connect(bob);
    await a.vote(0, true);
    await b.vote(0, false);

    // try to execute too early
    await expect(fia.execute(0)).to.be.revertedWith('Voting still active');

    // fast forward to after voting end but before execution delay
    const proposal = await fia.proposals(0);
    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const waitTo = Number(proposal.endTime) - Number(now) + 1;
    await ethers.provider.send('evm_increaseTime', [waitTo]);
    await ethers.provider.send('evm_mine');

    // now still too early because execution delay not met
    await expect(fia.execute(0)).to.be.revertedWith('Execution delay not met');

    // move forward past execution delay
    await ethers.provider.send('evm_increaseTime', [48 * 3600 + 1]);
    await ethers.provider.send('evm_mine');

    // quorum reached but tied votes -> should revert 'Proposal rejected'
    await expect(fia.execute(0)).to.be.revertedWith('Proposal rejected');
  });
});
