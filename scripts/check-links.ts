import { ethers, run } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await run("compile");
  const gameAddr = process.env.GAME_ADDRESS as string;
  const loveAddr = process.env.LOVE_ADDRESS as string;
  const distAddr = process.env.DIST_ADDRESS as string;
  
  if (!gameAddr || !loveAddr || !distAddr) 
    throw new Error("Set GAME_ADDRESS, LOVE_ADDRESS, and DIST_ADDRESS in .env");
  
  const game = await ethers.getContractAt("LilnadNFT", gameAddr);
  const love = await ethers.getContractAt("LoveToken", loveAddr);
  const distributor = await ethers.getContractAt("LoveDistributor", distAddr);
  
  // ตรวจสอบว่า LoveDistributor เชื่อมโยงกับ LilnadNFT ถูกต้อง
  const linkedGame = await distributor.game();
  // ตรวจสอบว่า LoveDistributor เชื่อมโยงกับ LoveToken ถูกต้อง
  const linkedLove = await distributor.love();
  // ตรวจสอบว่า LoveToken มี owner เป็น LoveDistributor
  const loveOwner = await love.owner();
  
  console.log("LoveDistributor.game:", linkedGame);
  console.log("LilnadNFT address   :", gameAddr);
  console.log("LoveDistributor.love:", linkedLove);
  console.log("LoveToken address   :", loveAddr);
  console.log("LoveToken.owner     :", loveOwner);
  console.log("LoveDistributor addr:", distAddr);
  
  let allCorrect = true;
  
  if (linkedGame.toLowerCase() !== gameAddr.toLowerCase()) {
    console.log("❌ Mismatch! LoveDistributor is linked to the wrong LilnadNFT.");
    allCorrect = false;
  }
  
  if (linkedLove.toLowerCase() !== loveAddr.toLowerCase()) {
    console.log("❌ Mismatch! LoveDistributor is linked to the wrong LoveToken.");
    allCorrect = false;
  }
  
  if (loveOwner.toLowerCase() !== distAddr.toLowerCase()) {
    console.log("❌ Mismatch! LoveToken owner is not set to LoveDistributor.");
    allCorrect = false;
  }
  
  if (allCorrect) {
    console.log("✅ All connections are correct!");
  } else {
    console.log("⚠️ Please ensure link-contracts.ts was executed successfully.");
  }
}

main().catch(console.error); 