import { ethers, run } from "hardhat";

const GAME = "0x48689be5D36ae3B94f5f2Dc8FD372A0e46A20933";   // ใส่ address ที่ได้จากขั้นตอน 1
const LOVE = "0xc68ad76b2E240f020903495D9a9855cc035fB966";   // ใส่ address จากขั้นตอน 2

async function main() {
  await run("compile");
  const Dist = await ethers.getContractFactory("LoveDistributor");
  const dist = await Dist.deploy(GAME, LOVE);
  await dist.waitForDeployment();
  console.log("Distributor deployed:", await dist.getAddress());
}

main().catch(console.error); 