import { ethers, run, network } from "hardhat";
import { formatEther } from "ethers";

async function main() {
  // Compile contracts if needed
  await run("compile");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current network:", network.name);

  const LilnadNFTFactory = await ethers.getContractFactory("LilnadNFT");
  
  console.log("Attempting to deploy LilnadNFT...");
  // MODIFIED: ส่ง deployer.address เป็น initialDevWallet argument
  const lilnadNFT = await LilnadNFTFactory.deploy(deployer.address);
  await lilnadNFT.waitForDeployment();

  const contractAddress = await lilnadNFT.getAddress();
  console.log("LilnadNFT deployed to:", contractAddress);

  // อ่าน MINT_FEE จาก contract
  const deployedMintFee = await lilnadNFT.MINT_FEE();
  console.log(
    "MINT_FEE on deployed contract (from contract's constant):",
    formatEther(deployedMintFee),
    "ETH"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
