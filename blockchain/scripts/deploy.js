const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of UserPublicKeys contract...");
  
  // Get the contract factory
  const UserPublicKeys = await ethers.getContractFactory("UserPublicKeys");
  
  // Deploy the contract
  const userPublicKeys = await UserPublicKeys.deploy();
  
  // Wait for deployment to finish
  await userPublicKeys.deployed();
  
  console.log("UserPublicKeys deployed to:", userPublicKeys.address);
  
  // Save contract address and ABI for frontend usage
  const fs = require("fs");
  const contractsDir = __dirname + "/../artifacts/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ UserPublicKeys: userPublicKeys.address }, undefined, 2)
  );
  
  console.log("Contract address saved to blockchain/artifacts/contracts/contract-address.json");
}

// Execute deploy function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying contract:", error);
    process.exit(1);
  });
