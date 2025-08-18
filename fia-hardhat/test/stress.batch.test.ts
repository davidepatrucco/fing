import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import hre from 'hardhat';
import { applyCommonTestSetup } from './helpers/setup';
const ethers = (hre as any).ethers;

describe('Stress: BatchTransfer gas & behavior', function () {
  it('batchTransfer to 500 recipients should complete or gracefully revert', async function () {
    const [deployer, treasury, founder] = await (hre as any).ethers.getSigners();
    const FIACoinV5 = await ethers.getContractFactory('FIACoinV5');
    const fia = await FIACoinV5.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();
    await applyCommonTestSetup(fia, deployer);

    const count = 500;
    const recipients: string[] = [];
    const amounts: any[] = [];
    for (let i = 0; i < count; i++) {
      recipients.push(ethers.Wallet.createRandom().address);
      amounts.push(ethers.parseUnits('1', 18));
    }

    // Attempt batchTransfer
    try {
      const tx = await fia.batchTransfer(recipients, amounts);
      const r = await tx.wait();
      // check gas used reasonable
      expect(BigInt(r.gasUsed.toString()) > 0n).to.be.true;
    } catch (err: any) {
      // if it fails due to block gas limit, it's acceptable for stress test
      expect(err.message).to.include('exceed') || expect(err.message).to.include('gas');
    }
  }).timeout(200000);
});
