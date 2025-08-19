import hre from 'hardhat';
const ethers = (hre as any).ethers;

export async function applyCommonTestSetup(fiaContract: any, deployer: any) {
  // Some token versions expose a setter for transaction limits; call it only if present.
  try {
    if (typeof fiaContract.setTransactionLimits !== 'undefined') {
      const supply = await fiaContract.totalSupply();
      await fiaContract.setTransactionLimits(supply, supply, 0, false);
    }
  } catch (e) {
    // ignore missing methods or reverts — tests will still try to exempt accounts below
  }

  // Exempt contract and deployer from fees to avoid fee interference in balance assertions
  if (typeof fiaContract.setFeeExempt !== 'undefined') {
    try {
      await fiaContract.setFeeExempt(await fiaContract.getAddress(), true);
    } catch (e) {
      // ignore
    }
    try {
      await fiaContract.setFeeExempt(deployer.address, true);
    } catch (e) {
      // ignore
    }
  }
}

export default applyCommonTestSetup;
