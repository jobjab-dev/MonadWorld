import { ethers, run } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await run("compile");
  const gameAddr = process.env.GAME_ADDRESS as string;
  const loveAddr = process.env.LOVE_ADDRESS as string;
  if (!gameAddr || !loveAddr) throw new Error("Set GAME_ADDRESS and LOVE_ADDRESS in .env");
  const game = await ethers.getContractAt("LilnadNFT", gameAddr);
  const love = await ethers.getContractAt("LoveToken", loveAddr);
  const distributor = await game.distributor();
  const loveOwner   = await love.owner();
  console.log("LilnadNFT.distributor:", distributor);
  console.log("LoveToken.owner   :", loveOwner);
  if (distributor.toLowerCase() === loveOwner.toLowerCase()) {
    console.log("✅ Distributor and LoveToken owner match. Linkage correct.");
  } else {
    console.log("❌ Mismatch! Please ensure setDistributor & transferOwnership executed.");
  }
}

main().catch(console.error); 