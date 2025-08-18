import { expect } from 'chai';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Treasury spend via governance', function () {
  it('propose treasury spend, vote, and execute', async function () {
    const [deployer, recipient] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');

    const fia = await FIACoinV5.deploy(deployer.address, deployer.address);
    await fia.waitForDeployment();

  // fund treasury
  const amount = ethers.parseUnits('1000', 18);
  await applyCommonTestSetup(fia, deployer);
  // transfer to treasury (owner/deployer is fee-exempt and limits disabled via helper)
  await fia.transfer(await fia.treasury(), amount);

    // create proposal to spend treasury -> send amount to recipient
    const abiCoder = new ethers.AbiCoder();
    const data = abiCoder.encode(['address','uint256'], [recipient.address, amount]);

    const ProposalType = { TREASURY_SPEND: 1 };

    // proposer must have enough balance >= PROPOSAL_THRESHOLD; deployer has total supply so ok
    await fia.propose('Spend treasury', ProposalType.TREASURY_SPEND, data);
    const pid = 0;

    // vote for as deployer
    await fia.vote(pid, true);

    // fast forward past voting period + execution delay
    const vp = await fia.VOTING_PERIOD();
    const ed = await fia.EXECUTION_DELAY();
    await ethers.provider.send('evm_increaseTime', [Number(vp) + Number(ed) + 10]);
    await ethers.provider.send('evm_mine');

    // execute proposal
    await fia.execute(pid);

    const bal = await fia.balanceOf(recipient.address);
    expect(BigInt(bal.toString())).to.equal(BigInt(amount.toString()));
  }).timeout(200000);
});
