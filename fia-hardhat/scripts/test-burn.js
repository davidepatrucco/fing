const { ethers } = require('hardhat');

async function main() {
  const [deployer, user] = await ethers.getSigners();

  const FIA = await ethers.getContractFactory('FIACoinV5');
  const fia = await FIA.deploy(deployer.address, deployer.address);
  await fia.waitForDeployment();

  console.log('Deployed FIACoinV5 at', await fia.getAddress());

  const initialTotal = await fia.totalSupply();
  console.log('Initial totalSupply:', initialTotal.toString());

  // transfer some tokens from deployer to user to set up
  const amount = ethers.parseUnits('1000', 18);
  await fia.transfer(user.address, amount);

  // use a third signer as recipient so neither party is fee-exempt (fees will apply)
  const recipient = (await ethers.getSigners())[2];
  const fiaUser = fia.connect(user);

  const tx = await fiaUser.transfer(recipient.address, ethers.parseUnits('100', 18));
  await tx.wait();

  const afterTotal = await fia.totalSupply();
  console.log('After totalSupply:', afterTotal.toString());

  // afterTotal and initialTotal are BigInt in ethers v6; use native comparison
  if (afterTotal < initialTotal) {
    console.log('✅ totalSupply decreased after burn');
  } else {
    console.error('❌ totalSupply did NOT decrease - burn failed');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
