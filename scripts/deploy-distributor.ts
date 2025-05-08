import { ethers, run } from "hardhat";

const GAME = "0xFD1819dAeD07E052C5f9C635EC29F233f12552C4";   // ใส่ address ที่ได้จากขั้นตอน 1
const LOVE = "0x5FbDB2315678afecb367f032d93F642f64180aa3";   // ใส่ address จากขั้นตอน 2

async function main() {
  await run("compile");
  const Dist = await ethers.getContractFactory("LoveDistributor");
  const dist = await Dist.deploy(GAME, LOVE);
  await dist.waitForDeployment();
  console.log("Distributor deployed:", await dist.getAddress());
}

main().catch(console.error); 