import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('E2E: Invariants & Fuzz', function () {
  it('initialSupply == currentTotalSupply + totalBurned after operations', async function () {
    const [deployer, alice, bob, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const initialTotal = await fia.totalSupply();

    // make some transfers
    await fia.transfer(alice.address, ethers.parseUnits('1000', 18));
    await fia.transfer(bob.address, ethers.parseUnits('500', 18));

    // burn some tokens
    const aFia = fia.connect(alice);
    await aFia.burn(ethers.parseUnits('100', 18));

    // invariant: initialTotal == currentTotalSupply + totalBurned
    const curTotal = await fia.totalSupply();
    const stats = await fia.getTokenStats();
    const burned = stats.totalBurned;

    expect(BigInt(initialTotal.toString())).to.equal(BigInt(curTotal.toString()) + BigInt(burned.toString()));
  });

  it('fuzzed transfer sequences do not break invariants (deterministic pseudo-random)', async function () {
    const [deployer, alice, bob, carol, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const accounts = [deployer, alice, bob, carol];
    const rnd = (seed: number) => {
      // simple deterministic xorshift-ish
      let x = seed || 123456;
      return () => {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return Math.abs(x);
      };
    };

    const gen = rnd(42);

    const initialTotal = BigInt((await fia.totalSupply()).toString());

    for (let i = 0; i < 200; i++) {
      const fromIdx = gen() % accounts.length;
      const toIdx = gen() % accounts.length;
      if (fromIdx === toIdx) continue;
      const from = fia.connect(accounts[fromIdx]);
      const toAddress = accounts[toIdx].address;

      // random small amount up to 1e6 tokens
      const amount = BigInt((gen() % 1000000) + 1) * 10n ** 18n;
      try {
        await from.transfer(toAddress, amount.toString());
      } catch (e) {
        // ignore failed transfers due to limits/insufficient balance
      }

      // check invariants periodically
      if (i % 25 === 0) {
        const curTotal = BigInt((await fia.totalSupply()).toString());
        const stats = await fia.getTokenStats();
        const burned = BigInt(stats.totalBurned.toString());
        expect(initialTotal).to.equal(curTotal + burned);

        // balances non-negative
        for (const acc of accounts) {
          const b = BigInt((await fia.balanceOf(acc.address)).toString());
          expect(b >= 0n).to.be.true;
        }
      }
    }
  });
});
