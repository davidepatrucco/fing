import hre from 'hardhat';

async function main() {
  const ethers = (hre as any).ethers;
  const [s] = await ethers.getSigners();
  const addr = await s.getAddress();
  const balance = await ethers.provider.getBalance(addr);
  console.log('address', addr);
  console.log('balance (wei)', balance.toString());
  console.log('balance (ETH)', ethers.formatEther(balance));

  // estimate cost if user wants to send createPool with overrides
  const gasLimit = Number(process.env.GAS_LIMIT || '1500000');
  const maxFeeGwei = Number(process.env.MAX_FEE_GWEI || '60');
  const maxFeeWei = BigInt(Math.floor(maxFeeGwei * 1e9));
  const estimatedCostWei = BigInt(gasLimit) * maxFeeWei;
  try {
    console.log('estimated tx cost (wei) for gasLimit', gasLimit, 'and maxFeeGwei', maxFeeGwei, ':', estimatedCostWei.toString());
    console.log('estimated tx cost (ETH):', ethers.formatEther(estimatedCostWei));
  } catch (_) {}
}

main().catch((e)=>{ console.error(e); process.exitCode=1; });
