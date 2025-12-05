const hre = require("hardhat");

async function main() {
  const CrowdFund = await hre.ethers.deployContract("CrowdFund");
  await CrowdFund.waitForDeployment();

  console.log("CrowdFund deployed to:", await CrowdFund.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
