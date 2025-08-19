import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: LPTimelock integration', function () {
  it('deposit LP tokens into LPTimelock and withdraw after unlock', async function () {
    const [deployer, user, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const LPTimelock = await ethers.getContractFactory('LPTimelock');

    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);
  // also exempt the test user from fees so LP-like transfers/deposits are not reduced
  await fia.setFeeExempt(user.address, true);

    // For LP simulation, we'll use FIA token as a stand-in for an ERC20 LP token
    // Deploy LPTimelock and deposit some tokens
  // deploy lock with user as owner
  const lockFactory = LPTimelock.connect(user);
  const lock = await lockFactory.deploy(await fia.getAddress(), (await ethers.provider.getBlock('latest')).timestamp + 60); // 60 seconds from now
  await lock.waitForDeployment();

  // transfer tokens to user and approve lock
  await fia.transfer(user.address, ethers.parseUnits('1000', 18));
  const u = fia.connect(user);
  await u.approve(await lock.getAddress(), ethers.parseUnits('1000', 18));

  // deposit into lock as owner (user)
  await lock.connect(user).deposit(ethers.parseUnits('1000', 18));
  const balanceLocked = await fia.balanceOf(await lock.getAddress());
  expect(BigInt(balanceLocked.toString())).to.equal(BigInt(ethers.parseUnits('1000', 18)));

    // fast forward past unlock
    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine');

  // withdraw (owner can withdraw after unlock)
  await lock.connect(user).withdraw();
  const remaining = await fia.balanceOf(user.address);
  expect(BigInt(remaining.toString()) >= BigInt(ethers.parseUnits('1000', 18))).to.be.true;
  }).timeout(200000);
});
