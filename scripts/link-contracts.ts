import { ethers, run } from "hardhat";

async function main() {
  await run("compile");

  const game = await ethers.getContractAt("LilnadNFT", process.env.GAME_ADDR!);
  const love = await ethers.getContractAt("LoveToken", process.env.LOVE_ADDR!);
  const dist = process.env.DIST_ADDR!;

  console.log("setDistributor tx:",
    await (await game.setDistributor(dist)).wait());

  console.log("transferOwnership tx:",
    await (await love.transferOwnership(dist)).wait());
}

main().catch(console.error);