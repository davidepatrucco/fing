import { expect } from "chai";
import { ethers } from "hardhat";

describe('FIACoin fees', function () {
  it('applies fees, distributes to treasury and founder, and burns correctly', async () => {
    const [deployer, treasury, founder, a, b] = await ethers.getSigners();

    const FIA = await ethers.getContractFactory('FIACoin');
    const fia = await FIA.deploy(treasury.address, founder.address);
    await fia.waitForDeployment();

    // transfer initial tokens to 'a' from deployer (deployer is fee-exempt => no fees)
    const initial = ethers.parseUnits('1000', 18);
    await fia.transfer(a.address, initial);

    // values for transfer
    const amount = ethers.parseUnits('100', 18); // 100 tokens

    // read fee params from contract
    const totalFeeBP = await fia.totalFeeBP();
    const feeToTreasuryBP = await fia.feeToTreasuryBP();
    const feeToFounderBP = await fia.feeToFounderBP();
    const feeToBurnBP = await fia.feeToBurnBP();

    // perform transfer from a -> b (both non-exempt)
    const fiaA = fia.connect(a);
    const tx = await fiaA.transfer(b.address, amount);
    await tx.wait();

    // calculate expected amounts using BigInt
    const feeAmount = (amount * BigInt(Number(totalFeeBP))) / BigInt(10000);
    const toTreasury = (feeAmount * BigInt(Number(feeToTreasuryBP))) / BigInt(Number(totalFeeBP));
    const toFounder = (feeAmount * BigInt(Number(feeToFounderBP))) / BigInt(Number(totalFeeBP));
    const toBurn = (feeAmount * BigInt(Number(feeToBurnBP))) / BigInt(Number(totalFeeBP));
    const received = amount - feeAmount;

    const balB = await fia.balanceOf(b.address);
    const balTreasury = await fia.balanceOf(treasury.address);
    const balFounder = await fia.balanceOf(founder.address);
    const totalSupplyAfter = await fia.totalSupply();

    // assertions
    expect(balB).to.equal(received);
    expect(balTreasury).to.equal(toTreasury);
    expect(balFounder).to.equal(toFounder);

    // initial total supply minted was 1_000_000_000 * 10**18, burned amount should reduce supply by toBurn
    // compute initial supply for comparison
    const initialSupply = (BigInt(1_000_000_000) * (BigInt(10) ** BigInt(18))) - toBurn;
    expect(totalSupplyAfter).to.equal(initialSupply);
  });
});
