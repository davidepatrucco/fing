import { ethers } from "hardhat";

async function main() {
  const fiaAddr = process.env.FIA_ADDR;
  if (!fiaAddr) throw new Error("FIA_ADDR env missing");
  const provider = (ethers as any).provider;
  const fia = await ethers.getContractAt("FIACoin", fiaAddr);

  fia.on("Fingered", (from: string, to: string, amount: bigint, event: any) => {
    console.log(`Fingered: ${from} -> ${to} : ${amount.toString()}`);
  });

  console.log("Listening for Fingered events... (ctrl+c to quit)");
  // Keep process alive
  process.stdin.resume();
}

main().catch((e) => { console.error(e); process.exit(1); });
