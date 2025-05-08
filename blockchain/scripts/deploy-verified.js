const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of updated contracts...");

  // Get the signer's wallet info for later user registration
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Deploy BlockchainPosts contract
  console.log("Deploying BlockchainPosts contract with signature verification...");
  const BlockchainPosts = await ethers.getContractFactory("BlockchainPosts");
  const blockchainPosts = await BlockchainPosts.deploy({
    // gasPrice: ethers.utils.parseUnits('5', 'gwei'),
  });
  await blockchainPosts.deployed();
  console.log("BlockchainPosts deployed to:", blockchainPosts.address);
  
  // Save contract addresses for frontend usage
  const fs = require("fs");
  const contractsDir = __dirname + "/../artifacts/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ 
      BlockchainPosts: blockchainPosts.address,
      DeployerInfo: {
        address: deployer.address
      }
    }, undefined, 2)
  );
  
  console.log("Contract addresses saved to blockchain/artifacts/contracts/contract-address.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });