import { expect } from "chai";
import hre from "hardhat";
const ethers = (hre as any).ethers;

describe('FIACoinV6 fees', function () {
  it('applies fees, distributes to treasury and founder, and burns correctly', async () => {
    const [deployer, treasury, founder, a, b, safe] = await ethers.getSigners();

    const V6 = await ethers.getContractFactory('FIACoinV6');
    const fia = await V6.deploy(treasury.address, founder.address, safe.address);
    await fia.waitForDeployment();

    // treasury is exempt, seed A with clean transfer
    await fia.setFeeExempt(treasury.address, true);
    const initial = ethers.parseUnits('1000', 18);
    await (fia.connect(treasury)).transfer(a.address, initial);

    const amount = ethers.parseUnits('100', 18);

    const totalFeeBP = await fia.totalFeeBP();
    const feeToTreasuryBP = await fia.feeToTreasuryBP();
    const feeToFounderBP = await fia.feeToFounderBP();
    const feeToBurnBP = await fia.feeToBurnBP();

  const balTreasuryBefore = await fia.balanceOf(treasury.address);
  const balFounderBefore = await fia.balanceOf(founder.address);
  const fiaA = fia.connect(a);
  await (await fiaA.transfer(b.address, amount)).wait();

    const feeAmount = (amount * BigInt(Number(totalFeeBP))) / 10000n;
    const toTreasury = (feeAmount * BigInt(Number(feeToTreasuryBP))) / BigInt(Number(totalFeeBP));
    const toFounder = (feeAmount * BigInt(Number(feeToFounderBP))) / BigInt(Number(totalFeeBP));
    const toBurn = (feeAmount * BigInt(Number(feeToBurnBP))) / BigInt(Number(totalFeeBP));
    const received = amount - feeAmount;

    const balB = await fia.balanceOf(b.address);
  const balTreasury = await fia.balanceOf(treasury.address);
  const balFounder = await fia.balanceOf(founder.address);
    const totalSupplyAfter = await fia.totalSupply();

    expect(balB).to.equal(received);
  expect(balTreasury - balTreasuryBefore).to.equal(toTreasury);
  expect(balFounder - balFounderBefore).to.equal(toFounder);

    const initialSupply = (BigInt(1_000_000_000_000_000) * (10n ** 18n)) - toBurn;
    expect(totalSupplyAfter).to.equal(initialSupply);
  });
});
