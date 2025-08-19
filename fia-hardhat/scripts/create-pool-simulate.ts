import hre from 'hardhat';

async function main(){
  const ethers = (hre as any).ethers;
  const FIA = process.env.FIA_ADDR;
  if (!FIA) throw new Error('Set FIA_ADDR env');
  const WETH = process.env.WETH_ADDR || '0x4200000000000000000000000000000000000006';
  const POS_MANAGER = process.env.POS_MANAGER || '0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2';
  const FACTORY = process.env.UNISWAP_FACTORY_ADDR;
  const FEE = Number(process.env.FEE || '3000');

  // order tokens
  const [token0, token1] = (FIA.toLowerCase() < WETH.toLowerCase()) ? [FIA, WETH] : [WETH, FIA];
  console.log('token0', token0, 'token1', token1, 'fee', FEE);

  // periphery helper: createAndInitializePoolIfNecessary(address,address,uint24,uint160)
  try {
    const iface = new (ethers as any).Interface(['function createAndInitializePoolIfNecessary(address,address,uint24,uint160)']);
    // sqrtPriceX96 for price 1:1
    const sqrtPriceX96 = (BigInt(1) << BigInt(96)).toString();
    const data = iface.encodeFunctionData('createAndInitializePoolIfNecessary', [token0, token1, FEE, sqrtPriceX96]);
    console.log('Encoded periphery helper calldata length', data.length);
    try {
      const res = await ethers.provider.call({ to: POS_MANAGER, data });
      console.log('periphery helper call result:', res);
    } catch (e:any) {
      console.warn('periphery helper call reverted/failed:', e?.message || e);
    }
  } catch (e:any) {
    console.warn('periphery helper simulation failed:', e?.message || e);
  }

  // factory createPool simulation
  if (FACTORY) {
    try {
      const ifaceF = new (ethers as any).Interface(['function createPool(address,address,uint24)']);
      const dataF = ifaceF.encodeFunctionData('createPool', [token0, token1, FEE]);
      console.log('Encoded factory.createPool calldata length', dataF.length);
      try {
        const resF = await ethers.provider.call({ to: FACTORY, data: dataF });
        console.log('factory.createPool call result:', resF);
      } catch (ef:any) {
        console.warn('factory.createPool call reverted/failed:', ef?.message || ef);
      }
    } catch (e:any) {
      console.warn('factory simulation failed:', e?.message || e);
    }
  } else {
    console.log('UNISWAP_FACTORY_ADDR not set; skipping factory simulation');
  }
}

main().catch((e)=>{ console.error(e); process.exitCode=1; });
