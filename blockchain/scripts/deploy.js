const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of contracts...");

  // Get the signer's wallet info for later user registration
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Get the contract factories
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const FeeAndTreasury = await ethers.getContractFactory("FeeAndTreasury");
  const ContentManagement = await ethers.getContractFactory("ContentManagement");
  const ObjectLifeCycle = await ethers.getContractFactory("ObjectLifecycle");
  
  // Deploy DIDRegistry first as other contracts depend on it
  console.log("Deploying DIDRegistry contract...");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  console.log("DIDRegistry deployed to:", await didRegistry.getAddress());
  
  // Deploy FeeAndTreasury next as it's needed by ObjectLifeCycle
  console.log("Deploying FeeAndTreasury contract...");
  const feeAndTreasury = await FeeAndTreasury.deploy(deployer.address);
  await feeAndTreasury.waitForDeployment();
  console.log("FeeAndTreasury deployed to:", await feeAndTreasury.getAddress());
  
  // Deploy ContentManagement with DIDRegistry address
  console.log("Deploying ContentManagement contract...");
  const contentManagement = await ContentManagement.deploy(await didRegistry.getAddress());
  await contentManagement.waitForDeployment();
  console.log("ContentManagement deployed to:", await contentManagement.getAddress());
  
  // Deploy ObjectLifeCycle with DIDRegistry and FeeAndTreasury addresses
  console.log("Deploying ObjectLifeCycle contract...");
  const objectLifeCycle = await ObjectLifeCycle.deploy(
    await didRegistry.getAddress(),
    await feeAndTreasury.getAddress()
  );
  await objectLifeCycle.waitForDeployment();
  console.log("ObjectLifeCycle deployed to:", await objectLifeCycle.getAddress());
  
  // Set initial fees
  console.log("Setting initial fees...");
  const createObjectSelector = objectLifeCycle.interface.getFunction("createObject").selector;
  const createObjectFee = ethers.parseEther("0.001"); // 0.001 ETH fee for creating objects
  await feeAndTreasury.setFee(createObjectSelector, createObjectFee);
  console.log("Set fee for createObject:", ethers.formatEther(createObjectFee), "ETH");
  
  // Generate DID for the deployer
  const deployerDid = `did:ethr:${deployer.address}`;
  console.log("Deployer DID:", deployerDid);
  
  // Register deployer in DIDRegistry by creating a signature
  console.log("Signing registration message...");
  const registrationMessage = `Register ${deployerDid}`;
  const messageBytes = ethers.toUtf8Bytes(registrationMessage);
  
  // Sign the raw message - contract will add the Ethereum prefix
  const flatSig = await deployer.signMessage(messageBytes);
  
  // Split the signature into its r, s, v components
  const sig = ethers.Signature.from(flatSig);
  
  // Reconstruct signature in the format the contract expects
  const signatureBytes = ethers.concat([
    sig.r,
    sig.s,
    new Uint8Array([sig.v - 27]) // Contract adds 27 to v internally
  ]);
  
  console.log("Registering deployer in DIDRegistry...");
  const registerTx = await didRegistry.register(messageBytes, signatureBytes);
  await registerTx.wait();
  console.log("Deployer registered in DIDRegistry");
  
  // Save contract addresses for frontend usage
  const addressFile = path.join(__dirname, "contract-addresses.json");
  
  fs.writeFileSync(
    addressFile,
    JSON.stringify({ 
      DIDRegistry: await didRegistry.getAddress(),
      FeeAndTreasury: await feeAndTreasury.getAddress(),
      ContentManagement: await contentManagement.getAddress(),
      ObjectLifeCycle: await objectLifeCycle.getAddress(),
      DeployerInfo: {
        address: deployer.address,
        did: deployerDid
      }
    }, undefined, 2)
  );
  
  console.log("Contract addresses saved to:", addressFile);
  console.log("Deployer account automatically registered with DID:", deployerDid);
}

// Execute deploy function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error deploying contracts:", error);
    process.exit(1);
  });
