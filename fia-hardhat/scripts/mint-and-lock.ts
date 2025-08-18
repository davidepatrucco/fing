import hre from "hardhat";
import fs from "fs";

async function main() {
  const ethers = (hre as any).ethers;
  const network = hre.network.name;

  const FIA = process.env.FIA_ADDR;
  if (!FIA) throw new Error("Set FIA_ADDR env to the FIA token address");

  const POS_MANAGER = process.env.POS_MANAGER || "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2"; // Uniswap v3 periphery on Base Sepolia
  const WETH = process.env.WETH_ADDR || "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH

  const AMOUNT_FIA = process.env.AMOUNT_FIA || "500000000"; // in token units (no decimals applied here)
  const AMOUNT_WETH = process.env.AMOUNT_WETH || "1"; // ETH amount
  const FEE = Number(process.env.FEE || "3000");
  const TICK_LOWER = Number(process.env.TICK_LOWER || "-887220");
  const TICK_UPPER = Number(process.env.TICK_UPPER || "887220");
  const UNLOCK_DAYS = Number(process.env.UNLOCK_DAYS || "30");

  console.log("network", network);
  const [deployer] = await ethers.getSigners();
  console.log("deployer", await deployer.getAddress());

  // Contracts
  const erc20Abi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];
  const wethAbi = [
    "function deposit() payable",
    "function approve(address,uint256) returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];
  // Use the standard tuple signature for Uniswap V3 NonfungiblePositionManager
  const defaultPosAbi = [
    "function mint(tuple(address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
    "function safeTransferFrom(address from,address to,uint256 tokenId)",
    "function positions(uint256 tokenId) view returns (uint128 nonce,address operator,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)"
  ];

  // Allow user to provide the official ABI JSON path via env POS_MANAGER_ABI_PATH, or place it at scripts/abis/NonfungiblePositionManager.json
  let posAbi: any = defaultPosAbi;
  const abiPath = process.env.POS_MANAGER_ABI_PATH || 'scripts/abis/NonfungiblePositionManager.json';
  try {
    if (fs.existsSync(abiPath)) {
      const raw = fs.readFileSync(abiPath, 'utf8');
      const parsed = JSON.parse(raw);
      // the JSON may be an object with 'abi' key
      posAbi = parsed.abi || parsed;
      console.log('Using NonfungiblePositionManager ABI from', abiPath);
    } else if (process.env.POS_MANAGER_ABI_PATH) {
      console.warn('POS_MANAGER_ABI_PATH set but file not found at', abiPath);
    }
  } catch (e:any) {
    console.warn('Could not load POS_MANAGER ABI file:', e?.message || e);
    posAbi = defaultPosAbi;
  }

  // Debug: inspect loaded ABI before creating contract
  try {
    console.log('DEBUG posAbi type:', typeof posAbi, 'isArray:', Array.isArray(posAbi));
    if (Array.isArray(posAbi)) {
      console.log('DEBUG posAbi length =', posAbi.length);
      if (posAbi.length > 0) console.log('DEBUG posAbi[0] sample =', JSON.stringify(posAbi[0]).slice(0,200));
    } else {
      console.log('DEBUG posAbi keys =', Object.keys(posAbi || {}).slice(0,20));
    }
  } catch (dE:any) { console.warn('DEBUG posAbi inspect failed', dE?.message || dE); }

  const fia = await ethers.getContractAt(erc20Abi, FIA, deployer);
  const weth = await ethers.getContractAt(wethAbi, WETH, deployer);
  const posManager = await ethers.getContractAt(posAbi as any, POS_MANAGER, deployer);

  // More debug: inspect the created contract object
  try {
    console.log('posManager keys:', Object.keys(posManager).slice(0,50));
    console.log('posManager.populateTransaction?', !!posManager.populateTransaction);
    if (posManager.populateTransaction) console.log('populateTransaction keys:', Object.keys(posManager.populateTransaction).slice(0,50));
    console.log('posManager.functions?', !!(posManager as any).functions);
    if ((posManager as any).functions) console.log('functions keys sample:', Object.keys((posManager as any).functions).slice(0,50));
  } catch (ie:any) { console.warn('post-contract debug failed', ie?.message || ie); }

  // Inspect the interface object more verbosely
  try {
    const iface = (posManager as any).interface;
    console.log('interface typeof =', typeof iface);
    if (iface) {
      try { console.log('interface keys =', Object.keys(iface).slice(0,50)); } catch(_) { console.log('interface keys not enumerable'); }
      const fns = iface.functions;
      console.log('interface.functions typeof =', typeof fns);
      if (fns) {
        try {
          if (typeof fns === 'object') console.log('interface.functions keys sample =', Object.keys(fns).slice(0,50));
          else if (typeof fns.size === 'number') console.log('interface.functions size =', fns.size);
        } catch(ffE:any){ console.log('could not enumerate interface.functions', ffE?.message || ffE); }
      }
    }
  } catch (ie:any) { console.warn('interface debug failed', ie?.message || ie); }

  // Diagnostics: ensure there is code at the POS_MANAGER address and list available functions
  const code = await ethers.provider.getCode(POS_MANAGER);
  if (!code || code === '0x') {
    throw new Error(`No contract code at POS_MANAGER ${POS_MANAGER} — check address`);
  }
  const ifaceFuncs = posManager && posManager.interface && posManager.interface.functions ? Object.keys(posManager.interface.functions) : null;
  console.log('posManager.interface present?', !!ifaceFuncs);
  if (ifaceFuncs) console.log('functions sample:', ifaceFuncs.slice(0,10));

  const hasPopulateMint = !!(posManager.populateTransaction && (posManager.populateTransaction as any).mint);
  if (!hasPopulateMint) {
    console.warn('posManager.populateTransaction.mint not found — attempting fallback using ethers.Interface.encodeFunctionData');
  }

  // Optional: if UNISWAP_FACTORY_ADDR provided, check pool existence and tickSpacing
  const FACTORY = process.env.UNISWAP_FACTORY_ADDR;
  if (FACTORY) {
    try {
      const factoryAbi = ["function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)", "function tickSpacingForFee(uint24 fee) view returns (int24)"];
      const factory = await ethers.getContractAt(factoryAbi, FACTORY, deployer);
      const poolAddr = await factory.getPool(FIA, WETH, FEE);
      if (!poolAddr || poolAddr === ethers.ZeroAddress) {
        console.warn(`No pool found for pair ${FIA}/${WETH} fee ${FEE} at factory ${FACTORY}. Aborting.`);
        return;
      }
      console.log('Found pool at', poolAddr);
      // Try to read tickSpacing if available on factory (some factories expose helper)
      try {
        const tickSpacing = await factory.tickSpacingForFee(FEE);
        console.log('tickSpacing (factory helper) =', tickSpacing.toString());
      } catch (_) {
        console.log('tickSpacing helper not available on factory; make sure to align ticks to pool.tickSpacing');
      }
    } catch (ferr:any) {
      console.warn('Factory check failed:', ferr?.message || ferr);
    }
  }

  // Resolve decimals for FIA
  let fiaDecimals = 18;
  try { fiaDecimals = await fia.decimals(); } catch (e) { console.log("couldn't read FIA decimals, defaulting to 18"); }

  const amountFiaWei = ethers.parseUnits(AMOUNT_FIA, fiaDecimals);
  const amountWethWei = ethers.parseUnits(AMOUNT_WETH, 18);

  // Optional: wrap ETH into WETH if requested
  if (process.env.WRAP_ETH === "1") {
    console.log("wrapping", AMOUNT_WETH, "ETH into WETH");
    const wrapTx = await weth.deposit({ value: amountWethWei });
    await wrapTx.wait();
    console.log("wrapped")
  }

  // Approve tokens to position manager only if allowance insufficient
  try {
    const ownerAddr = await deployer.getAddress();
    const currentFiaAllowance = await fia.allowance(ownerAddr, POS_MANAGER);
    if (currentFiaAllowance < amountFiaWei) {
      console.log("approving FIA to position manager");
      const approveFia = await fia.approve(POS_MANAGER, amountFiaWei);
      await approveFia.wait();
      console.log("FIA approved");
    } else {
      console.log("FIA allowance sufficient, skipping approve");
    }

    const currentWethAllowance = await weth.allowance(ownerAddr, POS_MANAGER);
    if (currentWethAllowance < amountWethWei) {
      console.log("approving WETH to position manager");
      const approveWeth = await weth.approve(POS_MANAGER, amountWethWei);
      await approveWeth.wait();
      console.log("WETH approved");
    } else {
      console.log("WETH allowance sufficient, skipping approve");
    }
  } catch (apErr:any) {
    console.error('approve error (possible nonce or provider issue):', apErr?.message || apErr);
    throw apErr;
  }

  // Build params
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const params = [
    FIA,
    WETH,
    FEE,
    TICK_LOWER,
    TICK_UPPER,
    amountFiaWei,
    amountWethWei,
    0,
    0,
    await deployer.getAddress(),
    deadline,
  ];

  console.log("simulating mint (callStatic) to obtain tokenId and amounts");
  let simulated: any;
  let rc: any;

  // If populateTransaction is available, use contract methods. Otherwise fallback to manual encoding via Interface.
  if (hasPopulateMint) {
    try {
      const populated = await (posManager.populateTransaction as any).mint(params);
      console.log('populateTransaction.mint ->', { to: populated.to, dataPresent: !!populated.data, dataLength: populated.data ? populated.data.length : 0 });
    } catch (popErr:any) {
      console.warn('populateTransaction.mint failed:', popErr?.message || popErr);
    }
    try {
      simulated = await (posManager as any).callStatic.mint(params, { gasLimit: 2_500_000 });
      console.log("simulated result", simulated[0].toString(), simulated[2].toString(), simulated[3].toString());
    } catch (err: any) {
      console.warn("callStatic mint failed (still trying onchain):", err?.message || err);
    }

    console.log("sending mint transaction via posManager.mint(...)");
    const tx = await (posManager as any).mint(params, { gasLimit: 2_500_000 });
    rc = await tx.wait();
    console.log("mint tx mined", rc.transactionHash);
  } else {
    // Fallback: construct an Interface and encode the function data
    try {
      const iface = new (ethers as any).Interface(posAbi as any);
      // ensure function exists
      let fnPresent = false;
      try { fnPresent = !!iface.getFunction('mint'); } catch (_) { fnPresent = false; }
      if (!fnPresent) throw new Error('mint function not present in ABI Interface');

      const data = iface.encodeFunctionData('mint', [params]);
      console.log('fallback encoded data length =', data.length);

      // simulate via provider.call
      try {
        const callResult = await ethers.provider.call({ to: POS_MANAGER, data });
        try {
          const decoded = iface.decodeFunctionResult('mint', callResult);
          simulated = decoded;
          console.log('simulated (decoded) result sample', decoded && decoded.length ? decoded.map((d:any)=>d?.toString?.()||d).slice(0,4) : decoded);
        } catch (decErr:any) {
          console.log('could not decode call result (it may revert or return nothing):', decErr?.message || decErr);
        }
      } catch (callErr:any) {
        console.warn('provider.call simulation failed:', callErr?.message || callErr);
      }

      console.log('sending raw tx via signer.sendTransaction');
      const tx = await deployer.sendTransaction({ to: POS_MANAGER, data, gasLimit: 2_500_000 });
      rc = await tx.wait();
      console.log('mint tx mined (fallback)', rc.transactionHash);
    } catch (fbErr:any) {
      console.error('fallback mint encoding/sending failed:', fbErr?.message || fbErr);
      throw fbErr;
    }
  }

  // Try to extract tokenId: prefer simulated value, fallback to events
  let tokenId: string | undefined;
  if (simulated && simulated[0]) tokenId = simulated[0].toString();
  if (!tokenId) {
    for (const e of rc.events || []) {
      if (!e.event) continue;
      if (e.event === 'Transfer') {
        // Transfer(address,address,uint256)
        const args = e.args;
        tokenId = args && args[2] ? args[2].toString() : undefined;
        if (tokenId) break;
      }
    }
  }
  if (!tokenId) throw new Error('tokenId not found after mint');
  console.log('minted tokenId', tokenId);

  // Deploy NFTTimelock
  console.log('deploying NFTTimelock...');
  const NFTTimelock = await ethers.getContractFactory('NFTTimelock', deployer);
  const unlockTime = Math.floor(Date.now()/1000) + UNLOCK_DAYS * 24 * 3600;
  const timelock = await NFTTimelock.deploy(POS_MANAGER, tokenId, unlockTime);
  await timelock.waitForDeployment?.();
  const timelockAddr = timelock.target || timelock.address;
  console.log('NFTTimelock deployed at', timelockAddr, 'unlockTime', unlockTime);

  // Transfer NFT to timelock
  console.log('transferring NFT to timelock...');
  const transferTx = await posManager['safeTransferFrom(address,address,uint256)'](await deployer.getAddress(), timelockAddr, tokenId);
  await transferTx.wait();
  console.log('transferred tokenId', tokenId, 'to', timelockAddr);

  console.log('\nDONE — Summary:');
  console.log('tokenId:', tokenId);
  console.log('timelock:', timelockAddr);
  console.log('verify owner on chain with ownerOf(tokenId)');
}

main().catch((e)=>{ console.error(e); process.exitCode=1; });
