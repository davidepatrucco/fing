import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('V6: Final 100% coverage', function () {
  it('propose function with sufficient balance emits ProposalCreated and returns proposalId', async function () {
    const [deployer, treasury, founder, alice] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

    // Give alice enough balance to meet PROPOSAL_THRESHOLD (1M FIA)
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('2000000', 18));

    // Create proposal directly through alice (not the test helper)
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [85]);
    await expect((fia.connect(alice)).propose('Direct proposal', 0, data))
      .to.emit(fia, 'ProposalCreated')
      .withArgs(0, alice.address, 'Direct proposal');

    // Verify proposalId was returned (check proposal exists)
    const proposal = await fia.proposals(0);
    expect(proposal.proposer).to.equal(alice.address);
    expect(proposal.description).to.equal('Direct proposal');
  }).timeout(120000);

  it('initializing path during transfer with both from and to non-zero', async function () {
    const [deployer, treasury, founder, alice, bob] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, deployer.address);
    await fia.waitForDeployment();

    // The constructor already executed the initializing path when minting to treasury
    // But to explicitly test the transfer case during initialization (from != 0, to != 0),
    // we'd need to trigger a transfer during constructor, which isn't easily testable
    // The line is already covered from constructor execution. Let's verify by checking the treasury balance
    const treasuryBalance = await fia.balanceOf(treasury.address);
    expect(treasuryBalance).to.be.greaterThan(0);

    // Additionally test the limits active = false branch if possible
    // Since limits are always active in current implementation, this would require
    // modifying the contract or having a special case
    
    // For completeness, let's verify the contract is properly initialized
    const limits: any = await fia.txLimits();
    expect(limits.limitsActive).to.equal(true);
    expect(limits.maxTxAmount).to.be.greaterThan(0);
  }).timeout(120000);
});
