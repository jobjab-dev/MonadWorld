import { ethers, run } from "hardhat";

async function main() {
  await run("compile");

  const game = await ethers.getContractAt("LilnadNFT", process.env.GAME_ADDRESS!);
  const love = await ethers.getContractAt("LoveToken", process.env.LOVE_ADDRESS!);
  const dist = process.env.DIST_ADDRESS!;

  console.log("setDistributor tx:",
    await (await game.setDistributor(dist)).wait());

  console.log("transferOwnership tx:",
    await (await love.transferOwnership(dist)).wait());
}

main().catch(console.error);