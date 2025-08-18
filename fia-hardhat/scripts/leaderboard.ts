import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const fiaAddr = process.env.FIA_ADDR;
  if (!fiaAddr) throw new Error("FIA_ADDR env missing");
  const [provider] = await (ethers as any).getSigners();
  const fia = await ethers.getContractAt("FIACoin", fiaAddr, provider);

  // Read events Fingered from block range (simple naive implementation)
  const filter = fia.filters.Fingered();
  const events = await fia.queryFilter(filter, 0, "latest");

  const given: Record<string, bigint> = {};
  const recvd: Record<string, bigint> = {};

  for (const ev of events) {
    const from = ev.args?.[0];
    const to = ev.args?.[1];
    const amount = ev.args?.[2] as bigint;
    given[from] = (given[from] || 0n) + amount;
    recvd[to] = (recvd[to] || 0n) + amount;
  }

  const sortTop = (map: Record<string, bigint>) =>
    Object.entries(map).sort((a, b) => Number(b[1] - a[1])).slice(0, 10);

  console.log("Top 10 Biggest Fingerer (given):");
  console.table(sortTop(given));
  console.log("Top 10 Biggest Receiver:");
  console.table(sortTop(recvd));
}

main().catch((e) => { console.error(e); process.exit(1); });
