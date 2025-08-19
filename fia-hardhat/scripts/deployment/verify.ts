import { run } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const file = path.resolve(process.cwd(), 'deployments/fia.json');
  if (!fs.existsSync(file)) throw new Error('deployments/fia.json not found; run deploy first');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const addr = payload.address;
  const args = payload.args || [];

  console.log('Verifying', addr, 'with args', args);
  await run('verify:verify', { address: addr, constructorArguments: args, network: process.env.HARDHAT_NETWORK || 'baseSepolia' });
}

main().catch((e) => { console.error(e); process.exit(1); });
