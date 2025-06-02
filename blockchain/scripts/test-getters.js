const { ethers } = require("hardhat");
const path = require("path");

async function main() {
  const addressFile = path.join(__dirname, "contract-addresses.json");
  const contractAddresses = require(addressFile);
  
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // Test DIDRegistry
  console.log("\nTesting DIDRegistry...");
  try {
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    const didRegistry = DIDRegistry.attach(contractAddresses.DIDRegistry);
    
    const isValid = await didRegistry.getAddress();
    console.log("DIDRegistry address:", isValid);

    const userProfile = await didRegistry.users(signer.address);
    console.log("User profile:", userProfile);
  } catch (error) {
    console.error("DIDRegistry test failed:", error.message);
  }

  // Test FeeAndTreasury
  console.log("\nTesting FeeAndTreasury...");
  try {
    const FeeAndTreasury = await ethers.getContractFactory("FeeAndTreasury");
    const feeAndTreasury = FeeAndTreasury.attach(contractAddresses.FeeAndTreasury);
    
    const treasuryAddress = await feeAndTreasury.treasury();
    console.log("Treasury address:", treasuryAddress);

    const owner = await feeAndTreasury.owner();
    console.log("Treasury owner:", owner);
  } catch (error) {
    console.error("FeeAndTreasury test failed:", error.message);
  }

  // Test ContentManagement
  console.log("\nTesting ContentManagement...");
  try {
    const ContentManagement = await ethers.getContractFactory("ContentManagement");
    const contentManagement = ContentManagement.attach(contractAddresses.ContentManagement);
    
    console.log("Testing getIPFSAnchorCount...");
    const ipfsCount = await contentManagement.getIPFSAnchorCount();
    console.log("IPFS anchor count:", ipfsCount.toString());

    console.log("Testing getOnChainPostCount...");
    const onChainCount = await contentManagement.getOnChainPostCount();
    console.log("On-chain post count:", onChainCount.toString());
  } catch (error) {
    console.error("ContentManagement test failed:", error.message);
  }

  // Test ObjectLifecycle
  console.log("\nTesting ObjectLifecycle...");
  try {
    const ObjectLifecycle = await ethers.getContractFactory("ObjectLifecycle");
    const objectLifecycle = ObjectLifecycle.attach(contractAddresses.ObjectLifeCycle);
    
    console.log("Testing getObjectCount...");
    const objectCount = await objectLifecycle.getObjectCount();
    console.log("Object count:", objectCount.toString());
  } catch (error) {
    console.error("ObjectLifecycle test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error running tests:", error);
    process.exit(1);
  });