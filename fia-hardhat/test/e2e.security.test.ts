import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Anti-MEV and security tests', function () {
  it('same-block protectedTransfer should revert for second tx (automine off)', async function () {
    const [deployer, alice, bob, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);
  // Re-enable tx limits so antiMEV checks run for this test
  const supply = await fia.totalSupply();
  await fia.setTransactionLimits(supply, supply, 0, true);

    // fund alice
    await fia.transfer(alice.address, ethers.parseUnits('10000', 18));
    const a = fia.connect(alice);

  // Use a helper contract to call protectedTransfer twice in the same transaction
  const Caller = await ethers.getContractFactory('TestProtectedCaller');
  const caller = await Caller.deploy();
  await caller.waitForDeployment();

  // Fund the caller and exempt it from fees so the first protectedTransfer can succeed
  await fia.transfer(await caller.getAddress(), ethers.parseUnits('10', 18));
  await fia.setFeeExempt(await caller.getAddress(), true);

  // First call in same tx should succeed, second should revert due to same-block protection
  await expect(caller.callTwice(await fia.getAddress(), bob.address, ethers.parseUnits('1', 18), 1, 2)).to.be.revertedWith('Same block transaction');
  });

  it('nonce reuse should revert', async function () {
    const [deployer, alice, bob, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
  await applyCommonTestSetup(fia, deployer);
  // Re-enable tx limits so antiMEV checks run for this test
  const supply2 = await fia.totalSupply();
  await fia.setTransactionLimits(supply2, supply2, 0, true);

  await fia.transfer(alice.address, ethers.parseUnits('1000', 18));
    const a = fia.connect(alice);
    await a.protectedTransfer(bob.address, ethers.parseUnits('1', 18), 10);
    await ethers.provider.send('evm_mine');
    await expect(a.protectedTransfer(bob.address, ethers.parseUnits('1', 18), 10)).to.be.revertedWith('Nonce used');
  });

  it('same-tx nonce reuse should revert (deterministic)', async function () {
    const [deployer, alice, bob, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);
    const supply2 = await fia.totalSupply();
    await fia.setTransactionLimits(supply2, supply2, 0, true);

    // Fund a caller helper and exempt from fees
    const Caller = await ethers.getContractFactory('TestProtectedCaller');
    const caller = await Caller.deploy();
    await caller.waitForDeployment();
    await fia.transfer(await caller.getAddress(), ethers.parseUnits('10', 18));
    await fia.setFeeExempt(await caller.getAddress(), true);

  // Call reuseNonceInOneTx which calls protectedTransfer twice with same nonce in same external tx
  // Note: FIACoinV5 checks 'Same block transaction' before 'Nonce used', so when both calls occur
  // in the same external transaction the same-block check will revert first. We assert that here.
  await expect(caller.reuseNonceInOneTx(await fia.getAddress(), bob.address, ethers.parseUnits('1', 18), 42)).to.be.revertedWith('Same block transaction');
  });
});
