import hre from 'hardhat';

async function main(){
  const ethers = (hre as any).ethers;
  const FIA = process.env.FIA_ADDR;
  if (!FIA) throw new Error('Set FIA_ADDR env');
  const WETH = process.env.WETH_ADDR || '0x4200000000000000000000000000000000000006';
  const FACTORY = process.env.UNISWAP_FACTORY_ADDR;
  const POOL_ADDR = process.env.POOL_ADDR;
  const FEE = Number(process.env.FEE || '3000');

  let poolAddr = POOL_ADDR;
  if (!poolAddr) {
    if (!FACTORY) throw new Error('Set either POOL_ADDR or UNISWAP_FACTORY_ADDR in env');
    const factoryAbi = ['function getPool(address,address,uint24) view returns (address)'];
    const factory = await ethers.getContractAt(factoryAbi, FACTORY);
    poolAddr = await factory.getPool(FIA, WETH, FEE);
  }

  if (!poolAddr || poolAddr === ethers.ZeroAddress) {
    console.log('Pool not found. Provide POOL_ADDR or ensure factory has pool.');
    process.exitCode = 1;
    return;
  }

  console.log('poolAddr', poolAddr);
  try {
    const poolAbi = ['function tickSpacing() view returns (int24)'];
    const pool = await ethers.getContractAt(poolAbi, poolAddr);
    const tickSpacing = await pool.tickSpacing();
    console.log('tickSpacing =', tickSpacing.toString());
  } catch (e:any) {
    console.warn('Could not read tickSpacing from pool:', e?.message || e);
  }
}

main().catch((e)=>{ console.error(e); process.exitCode=1; });
