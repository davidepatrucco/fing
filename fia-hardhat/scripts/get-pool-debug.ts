import hre from 'hardhat';

async function main(){
  const ethers = (hre as any).ethers;
  const POOL = process.env.POOL_ADDR;
  if (!POOL) throw new Error('Set POOL_ADDR env');

  console.log('poolAddr', POOL);
  // getCode
  const code = await ethers.provider.getCode(POOL);
  console.log('code length', code ? code.length : 0);
  console.log('code startsWith 0x', code.slice(0,10));

  // attempt common calls on Uniswap V3 pool
  const checks = [
    { name: 'token0', sig: 'function token0() view returns (address)' },
    { name: 'token1', sig: 'function token1() view returns (address)' },
    { name: 'fee', sig: 'function fee() view returns (uint24)' },
    { name: 'tickSpacing', sig: 'function tickSpacing() view returns (int24)' },
    { name: 'slot0', sig: 'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,int16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)' }
  ];

  for (const c of checks) {
    try {
      const abi = [c.sig];
      const contract = await ethers.getContractAt(abi, POOL);
      const res = await (contract as any)[c.name]();
      console.log(c.name, '=>', res && res.toString ? res.toString() : res);
    } catch (e:any) {
      console.log(c.name, 'failed:', e?.message || e);
    }
  }

  // try to call via low-level provider.call and see raw return for tickSpacing
  try {
    const iface = new (ethers as any).Interface(['function tickSpacing() view returns (int24)']);
    const data = iface.encodeFunctionData('tickSpacing', []);
    const raw = await ethers.provider.call({ to: POOL, data });
    console.log('raw tickSpacing call raw:', raw);
  } catch (e:any) {
    console.log('raw tickSpacing call failed:', e?.message || e);
  }

}

main().catch((e)=>{ console.error(e); process.exitCode=1; });
