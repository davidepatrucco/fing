const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FIACoinV6 executor flow", function () {
  let FIACoinV6, MockSafe, fiacoin, fiacoinAsOwner, mockSafe, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    FIACoinV6 = await ethers.getContractFactory("FIACoinV6");
    MockSafe = await ethers.getContractFactory("MockSafe");

  mockSafe = await MockSafe.deploy();
  await mockSafe.waitForDeployment();

    // deploy token with treasury = owner, founder = owner, executor = mockSafe
  fiacoin = await FIACoinV6.deploy(owner.address, owner.address, mockSafe.target);
  await fiacoin.waitForDeployment();
  // deployed contract is connected to deployer (owner) by default
  fiacoinAsOwner = fiacoin;
  // debug addresses
  // console.log("mockSafe:", mockSafe.target, "fiacoin:", fiacoin.target);

    // fund treasury by transferring some tokens to treasury
    // Note: constructor minted total supply to deployer (owner)
    // transfer 1000 tokens to treasury (owner in this setup already has tokens)
  });

  it("allows only executor or owner to call execute and performs TREASURY_SPEND", async function () {
    // Create a treasury spend proposal: send 1 token (1e18) to alice
  const amount = ethers.parseUnits("1.0", 18);
  // encode arguments (address,uint256) without function selector
  const argsIface = new ethers.Interface(["function f(address,uint256)"]);
  const argsEncoded = argsIface.encodeFunctionData("f", [alice.address, amount]);
  const data = "0x" + argsEncoded.slice(10); // strip 4-byte selector

  // Create proposal via owner-only test helper which bypasses PROPOSAL_THRESHOLD
  const priorCount = await fiacoin.proposalCount();
  const tx = await fiacoinAsOwner.ownerCreateProposalForTests(owner.address, "treasury spend", 1, data);
  await tx.wait();
  const proposalId = Number(priorCount);

  const ownerBalBeforeVote = await fiacoin.balanceOf(owner.address);
  // ensure unauthorized accounts cannot execute before owner
  await expect(fiacoin.connect(bob).execute(proposalId)).to.be.revertedWith("Not authorized to execute");
  // cast vote
  await fiacoinAsOwner.vote(proposalId, true);

    // fast-forward time: end voting + execution delay
  const VOTING_PERIOD = Number(await fiacoin.VOTING_PERIOD());
  const EXECUTION_DELAY = Number(await fiacoin.EXECUTION_DELAY());

  await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + EXECUTION_DELAY + 10]);
    await ethers.provider.send("evm_mine");

    // Before execute: owner balance vs alice
  const aliceBefore = await fiacoin.balanceOf(alice.address);

    // Build calldata for fiacoin.execute(proposalId)
  const iface = new ethers.Interface(["function execute(uint256)"]);
  const calldata = iface.encodeFunctionData("execute", [proposalId]);

  // Call through mockSafe - should succeed
  // exempt recipient from wallet/fee limits to allow treasury transfer in test
  await fiacoinAsOwner.setFeeExempt(alice.address, true);
  // debug: alice balance before execute
  // Debug proposal state before execute
  const proposal = await fiacoin.proposals(proposalId);
  // debug: proposal state (suppressed)
  const totalVotes = BigInt(proposal.forVotes.toString()) + BigInt(proposal.againstVotes.toString());
  const totalSupply = BigInt((await fiacoin.totalSupply()).toString());
  const quorumPct = BigInt((await fiacoin.QUORUM_PERCENTAGE()).toString());
  const quorum = (totalSupply * quorumPct) / 100n;
  // debug: totalVotes vs quorum (suppressed)
  // debug: treasury balance (suppressed)

  // (debug) skipping direct call here; will execute once below as owner
  // Exempt treasury and founder from fees/limits so internal treasury transfer succeeds in test
  const treasuryAddr = await fiacoin.treasury();
  const founderAddr = await fiacoin.founderWallet();
  await fiacoinAsOwner.setFeeExempt(treasuryAddr, true);
  await fiacoinAsOwner.setFeeExempt(founderAddr, true);

  // Execute via MockSafe (external executor) as owner to simulate Safe executing the proposal
  const execIface = new ethers.Interface(["function execute(uint256)"]);
  const execCalldata = execIface.encodeFunctionData("execute", [proposalId]);
  await mockSafe.connect(owner).callExecute(fiacoin.target, execCalldata);

  const aliceAfter = await fiacoin.balanceOf(alice.address);
  const expected = aliceBefore + amount;
  expect(aliceAfter.toString()).to.equal(expected.toString());

  // After execution, re-calling should revert (either not authorized or already executed)
  await expect(fiacoin.connect(bob).execute(proposalId)).to.be.reverted;
  });
});
