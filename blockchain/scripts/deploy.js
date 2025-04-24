const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of contracts...");
  
  // Get the contract factories
  const UserPublicKeys = await ethers.getContractFactory("UserPublicKeys");
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const BlockchainPosts = await ethers.getContractFactory("BlockchainPosts");
  
  // Deploy contracts
  console.log("Deploying UserPublicKeys contract...");
  const userPublicKeys = await UserPublicKeys.deploy();
  await userPublicKeys.deployed();
  console.log("UserPublicKeys deployed to:", userPublicKeys.address);
  
  console.log("Deploying UserRegistry contract...");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.deployed();
  console.log("UserRegistry deployed to:", userRegistry.address);
  
  console.log("Deploying BlockchainPosts contract...");
  const blockchainPosts = await BlockchainPosts.deploy();
  await blockchainPosts.deployed();
  console.log("BlockchainPosts deployed to:", blockchainPosts.address);
  
  // Save contract addresses and ABIs for frontend usage
  const fs = require("fs");
  const contractsDir = __dirname + "/../artifacts/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ 
      UserPublicKeys: userPublicKeys.address,
      UserRegistry: userRegistry.address,
      BlockchainPosts: blockchainPosts.address
    }, undefined, 2)
  );
  
  console.log("Contract addresses saved to blockchain/artifacts/contracts/contract-address.json");
}

// Execute deploy function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying contracts:", error);
    process.exit(1);
  });
