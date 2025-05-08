import { ethers, run } from "hardhat";

async function main() {
  await run("compile");

  const LoveToken = await ethers.getContractFactory("LoveToken");
  const love = await LoveToken.deploy();
  await love.waitForDeployment();
  console.log(`LoveToken deployed to address: ${await love.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 