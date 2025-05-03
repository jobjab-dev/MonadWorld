import { ethers, run } from "hardhat";

async function main() {
  // Compile contracts if needed
  await run("compile");

  // Deploy GameSBT contract
  const GameSBT = await ethers.getContractFactory("GameSBT");
  const gameSBT = await GameSBT.deploy();
  await gameSBT.waitForDeployment();

  console.log(`GameSBT deployed to address: ${await gameSBT.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 