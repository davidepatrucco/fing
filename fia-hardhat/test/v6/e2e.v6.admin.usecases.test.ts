import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
const ethers = (hre as any).ethers;

describe('E2E V6: Admin use cases', function () {
  it('covers fees config, fee exemptions, limits (preconfigured), pause/unpause, reward pool, executor, execute, test helpers', async function () {
    const [deployer, treasury, founder, alice, bob, safe] = await ethers.getSigners();

    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // Make treasury fee-exempt for clean seeding
    await fia.setFeeExempt(treasury.address, true);
    // Seed alice from treasury
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('10000', 18));

    // Fees: setTotalFeeBP within limits and with delay guard
    const oldFee = await fia.totalFeeBP();
    // Move time forward to satisfy FEE_CHANGE_DELAY
    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');
    await fia.setTotalFeeBP(150);
    expect(await fia.totalFeeBP()).to.equal(150);

    // Fee distribution must sum to totalFeeBP
    await fia.setFeeDistribution(75, 45, 30); // 75+45+30=150
    expect(await fia.feeToTreasuryBP()).to.equal(75);
    expect(await fia.feeToFounderBP()).to.equal(45);
    expect(await fia.feeToBurnBP()).to.equal(30);

    // Fee exemptions: single and (note) no batch in V6; test single set
    await fia.setFeeExempt(alice.address, true);
    expect(await fia.isFeeExempt(alice.address)).to.equal(true);

    // Limits: preconfigured, no setter. Read and assert they are active and > 0
    const limits: any = await fia.txLimits();
    expect(limits.limitsActive).to.equal(true);
    expect(limits.maxTxAmount > 0n).to.equal(true);
    expect(limits.maxWalletAmount > 0n).to.equal(true);

    // Pause / Unpause
    await fia.emergencyPause();
    await expect(fia.transfer(bob.address, 1)).to.be.revertedWithCustomError(fia, 'EnforcedPause');
    await fia.emergencyUnpause();
    // After unpause a transfer by treasury should work
    await (fia.connect(treasury)).transfer(bob.address, ethers.parseUnits('1', 18));

  // Reward pool: owner needs balance to fund; mint test tokens to owner then add
  const rewardTopUp = ethers.parseUnits('100', 18);
  const beforePool = await fia.rewardPool();
  await fia.ownerMintForTests(deployer.address, rewardTopUp);
  await fia.addToRewardPool(rewardTopUp);
    const afterPool = await fia.rewardPool();
  expect(afterPool - beforePool).to.equal(rewardTopUp);

    // Executor: setExecutor and execute a test-only proposal via owner fallback
    await fia.setExecutor(safe.address);
    expect(await fia.executor()).to.equal(safe.address);

    // Use ownerCreateProposalForTests to create a fee change to 120, then owner executes
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [120]);
  const pid = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Set fee to 1.2%', 0, data);
  const tx = await fia.ownerCreateProposalForTests(deployer.address, 'Set fee to 1.2%', 0, data);
    await tx.wait();

  // Vote with treasury (has large balance) to reach quorum and majority
  await (fia.connect(treasury)).vote(Number(pid), true);

  // Fast-forward past voting period + execution delay
  const votingPeriod = 7 * 24 * 60 * 60; // aligns with V6 constant
  const execDelay = 48 * 60 * 60;        // aligns with V6 constant
  await ethers.provider.send('evm_increaseTime', [votingPeriod + execDelay + 1]);
  await ethers.provider.send('evm_mine');

    // Try execute as owner fallback (authorized alongside executor)
    const execTx = await fia.execute(Number(pid));
    await execTx.wait();
    expect(await fia.totalFeeBP()).to.equal(120);

    // Test helpers: ownerMintForTests
    const beforeBal = await fia.balanceOf(bob.address);
    await fia.ownerMintForTests(bob.address, ethers.parseUnits('10', 18));
    const afterBal = await fia.balanceOf(bob.address);
    expect(afterBal - beforeBal).to.equal(ethers.parseUnits('10', 18));
  }).timeout(240000);

  it('edge cases: fee delay, max cap, wrong distribution, unauthorized execute, quorum not met, double execute', async function () {
    const [deployer, treasury, founder, alice, safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // Prepare: pass first delay and set fee to a safe value
    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');
    await fia.setTotalFeeBP(100);

    // Immediate change should fail due to delay
    await expect(fia.setTotalFeeBP(90)).to.be.revertedWith('Fee change too frequent');

    // Advance time then attempt exceeding cap
    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');
    await expect(fia.setTotalFeeBP(201)).to.be.revertedWith('Fee exceeds maximum');

    // Wrong distribution sum
    await expect(fia.setFeeDistribution(40, 40, 10)).to.be.revertedWith('Distribution must equal total fee');

    // Unauthorized execute should revert early
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [80]);
    const pid = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Fee 0.8%', 0, data);
    await (await fia.ownerCreateProposalForTests(deployer.address, 'Fee 0.8%', 0, data)).wait();
    await expect(fia.connect(alice).execute(Number(pid))).to.be.revertedWith('Not authorized to execute');

    // Quorum not met: fast-forward beyond voting + delay without votes
    await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 48 * 60 * 60 + 2]);
    await ethers.provider.send('evm_mine');
    await expect(fia.execute(Number(pid))).to.be.revertedWith('Quorum not met');

  // Reach quorum and execute; second execute should fail
  // Rewind isn't supported; create a new proposal to execute cleanly
    const data2 = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [90]);
    const pid2 = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Fee 0.9%', 0, data2);
    await (await fia.ownerCreateProposalForTests(deployer.address, 'Fee 0.9%', 0, data2)).wait();
    await (fia.connect(treasury)).vote(Number(pid2), true);
    await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 48 * 60 * 60 + 2]);
    await ethers.provider.send('evm_mine');
    await (await fia.execute(Number(pid2))).wait();
    await expect(fia.execute(Number(pid2))).to.be.revertedWith('Already executed');
  }).timeout(240000);

  it('perverse cases: toggle exemptions affect fees; pause blocks protected & batch; cooldown enforced for protected; zero-fee mode', async function () {
    const [deployer, treasury, founder, alice, bob, safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // Treasury fee-exempt and seeding
    await fia.setFeeExempt(treasury.address, true);
    await (fia.connect(treasury)).transfer(alice.address, ethers.parseUnits('2000', 18));
    await (fia.connect(treasury)).transfer(bob.address, ethers.parseUnits('0', 18));

    // Read current fee
    const totalFeeBP = Number(await fia.totalFeeBP());
    const net = (amt: bigint) => amt - ((amt * BigInt(totalFeeBP)) / 10000n);

    // 1) Exemption toggling effect on fees (alice -> bob)
    await fia.setFeeExempt(alice.address, true);
    const before1 = await fia.balanceOf(bob.address);
    await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
    const after1 = await fia.balanceOf(bob.address);
    expect(after1 - before1).to.equal(ethers.parseUnits('100', 18));
    // remove exemption and transfer again: bob should receive net
    await fia.setFeeExempt(alice.address, false);
    const before2 = await fia.balanceOf(bob.address);
    await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
    const after2 = await fia.balanceOf(bob.address);
    expect(after2 - before2).to.equal(net(ethers.parseUnits('100', 18)));

    // 2) Pause blocks protectedTransfer and batchTransfer
    await fia.emergencyPause();
    await expect((fia.connect(alice)).protectedTransfer(bob.address, ethers.parseUnits('1', 18), 1)).to.be.revertedWithCustomError(fia, 'EnforcedPause');
    await expect((fia.connect(alice)).batchTransfer([bob.address], [ethers.parseUnits('1', 18)])).to.be.revertedWithCustomError(fia, 'EnforcedPause');
    await fia.emergencyUnpause();

    // 3) Cooldown enforced for protectedTransfer
    await (fia.connect(alice)).protectedTransfer(bob.address, ethers.parseUnits('1', 18), 777);
    await expect((fia.connect(alice)).protectedTransfer(bob.address, ethers.parseUnits('1', 18), 778)).to.be.revertedWith('Cooldown not met');
    // advance time >= cooldown (1 minute)
    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine');
    await (fia.connect(alice)).protectedTransfer(bob.address, ethers.parseUnits('1', 18), 779);

    // 4) Zero-fee mode: set fee to 0 and ensure transfers are fee-free for non-exempt
    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');
    await fia.setTotalFeeBP(0);
    await fia.setFeeDistribution(0, 0, 0);
    const before3 = await fia.balanceOf(bob.address);
    await (fia.connect(alice)).transfer(bob.address, ethers.parseUnits('100', 18));
    const after3 = await fia.balanceOf(bob.address);
    expect(after3 - before3).to.equal(ethers.parseUnits('100', 18));
  }).timeout(240000);

  it('governance execute timing reverts: during vote and before execution delay', async function () {
    const [deployer, treasury, founder, alice, bob, safe] = await ethers.getSigners();
    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // Create a proposal via test helper
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [110]);
    const pid = await fia.ownerCreateProposalForTests.staticCall(deployer.address, 'Set fee to 1.1%', 0, data);
    await (await fia.ownerCreateProposalForTests(deployer.address, 'Set fee to 1.1%', 0, data)).wait();

    // Execute during voting period should revert
    await expect(fia.execute(Number(pid))).to.be.revertedWith('Voting still active');

    // Fast-forward to just after voting end but before execution delay
    const votingPeriod = 7 * 24 * 60 * 60; // 7 days
    const execDelay = 48 * 60 * 60;        // 48 hours
    await ethers.provider.send('evm_increaseTime', [votingPeriod + 2]);
    await ethers.provider.send('evm_mine');
    await expect(fia.execute(Number(pid))).to.be.revertedWith('Execution delay not met');
  }).timeout(240000);
});
 
