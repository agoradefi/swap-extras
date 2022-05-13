import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";

const outputFilePath = `./deployments/${hre.network.name}.json`;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`>>>>>>>>>>>> Deployer: ${deployer.address} <<<<<<<<<<<<\n`);

  const deployments = JSON.parse(readFileSync(outputFilePath, "utf-8"));

  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(deployer.address);
  await router.deployed();
  console.log("Router deployed to:", router.address);

  // save data
  deployments.Router = router.address;
  writeFileSync(outputFilePath, JSON.stringify(deployments, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
