import hre from "hardhat";
const ethers = (hre as any).ethers;
import fs from 'fs';
import path from 'path';

type Row = [string, number];

function parseCSV(contents: string): Row[] {
  const lines = contents.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(l => {
    const [addr, amt] = l.split(',').map(s => s.trim());
    return [addr, Number(amt)];
  });
}

async function main() {
  const [, signer] = await ethers.getSigners();
  const fiaAddr = process.env.FIA_ADDR;
  if (!fiaAddr) throw new Error("FIA_ADDR env missing");
  const fia = await ethers.getContractAt("FIACoin", fiaAddr, signer);

  // Support: node --loader ts-node/esm scripts/airdrop.ts --file recipients.csv
  const args = process.argv.slice(2);
  let rows: Row[] = [];
  const fileArgIndex = args.findIndex(a => a === '--file');
  if (fileArgIndex >= 0 && args[fileArgIndex + 1]) {
    const file = path.resolve(process.cwd(), args[fileArgIndex + 1]);
    const contents = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) {
      const data = JSON.parse(contents);
      rows = data.map((r: any) => [r.address, Number(r.amount)]);
    } else {
      rows = parseCSV(contents);
    }
  }

  // fallback: small inline list in code
  if (rows.length === 0) {
    rows = [
      // ["0xFriend1...", 10000],
    ];
  }

  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const txs: any[] = [];
    for (const [addr, amount] of batch) {
      const t = await fia.transfer(addr, ethers.parseUnits(amount.toString(), 18));
      txs.push(t);
      console.log('sent', amount, 'to', addr);
    }
    // wait for all in batch
    for (const t of txs) await t.wait();
    console.log('batch', (i / BATCH) + 1, 'done');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
