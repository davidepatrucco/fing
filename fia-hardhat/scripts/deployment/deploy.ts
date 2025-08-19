import hre from "hardhat";
const ethers = (hre as any).ethers;
import fs from 'fs';
import path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_ADDR || deployer.address; // override via env
  const founder  = process.env.FOUNDER_ADDR || deployer.address;

  const FIA = await ethers.getContractFactory("FIACoin");
  const fia = await FIA.deploy(treasury, founder);
  await fia.waitForDeployment();
  const addr = await fia.getAddress();
  console.log("Deployer:", deployer.address);
  console.log("FIA deployed at:", addr);

  const outDir = path.resolve(process.cwd(), 'deployments');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const payload = { address: addr, args: [treasury, founder] };
  fs.writeFileSync(path.join(outDir, 'fia.json'), JSON.stringify(payload, null, 2));
  console.log('Saved deployment to deployments/fia.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
