import hre from 'hardhat';
const ethers = (hre as any).ethers;

export async function applyCommonTestSetup(fiaContract: any, deployer: any) {
  // disable transaction limits to allow large transfers in tests
  const supply = await fiaContract.totalSupply();
  await fiaContract.setTransactionLimits(supply, supply, 0, false);

  // exempt contract and deployer from fees to avoid fee interference in balance assertions
  await fiaContract.setFeeExempt(await fiaContract.getAddress(), true);
  await fiaContract.setFeeExempt(deployer.address, true);
}

export default applyCommonTestSetup;
