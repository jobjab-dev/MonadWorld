import { ethers, run } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await run("compile");
  const loveAddr = process.env.LOVE_ADDRESS as string;
  const distAddr = process.env.DIST_ADDRESS as string;
  if (!loveAddr || !distAddr) throw new Error("Set LOVE_ADDRESS and DIST_ADDRESS in .env");
  const love = await ethers.getContractAt("LoveToken", loveAddr);
  const tx = await love.transferOwnership(distAddr);
  console.log("tx submitted: ", tx.hash);
  await tx.wait();
  console.log("✅ Ownership transferred to", distAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 