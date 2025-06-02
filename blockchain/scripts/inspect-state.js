const { ethers } = require("hardhat");
const path = require("path");

async function main() {
  console.log("Inspecting deployed contracts state...\n");

  // Get contract addresses from the JSON file
  const addressFile = path.join(__dirname, "contract-addresses.json");
  const contractAddresses = require(addressFile);
  
  // Get contract factories
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const ContentManagement = await ethers.getContractFactory("ContentManagement");
  const ObjectLifecycle = await ethers.getContractFactory("ObjectLifecycle");
  const FeeAndTreasury = await ethers.getContractFactory("FeeAndTreasury");

  // Connect to deployed contracts
  const didRegistry = DIDRegistry.attach(contractAddresses.DIDRegistry);
  const contentManagement = ContentManagement.attach(contractAddresses.ContentManagement);
  const objectLifecycle = ObjectLifecycle.attach(contractAddresses.ObjectLifeCycle);
  const feeAndTreasury = FeeAndTreasury.attach(contractAddresses.FeeAndTreasury);

  console.log("Connected to contracts:");
  console.log("- DIDRegistry:", await didRegistry.getAddress());
  console.log("- ContentManagement:", await contentManagement.getAddress());
  console.log("- ObjectLifecycle:", await objectLifecycle.getAddress());
  console.log("- FeeAndTreasury:", await feeAndTreasury.getAddress());
  console.log();

  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log();

  // Check DIDRegistry state
  console.log("=== DIDRegistry State ===");
  try {
    const userProfile = await didRegistry.users(deployer.address);
    console.log("Deployer registration status:", userProfile.isRegistered);
    if (userProfile.isRegistered) {
      console.log("- Profile Data CID:", userProfile.profileDataCID || "Not set");
      console.log("- Communication Key CID:", userProfile.commPubKeyCID || "Not set");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
  }
  console.log();

  // Check ContentManagement state
  console.log("=== ContentManagement State ===");
  try {
    const ipfsCounter = await contentManagement.getIPFSAnchorCount();
    const onChainCounter = await contentManagement.getOnChainPostCount();
    
    console.log("IPFS Anchored Posts:", ipfsCounter.toString());
    for (let i = 1; i <= ipfsCounter; i++) {
      const post = await contentManagement.ipfsAnchors(i);
      console.log(`\nPost #${i}:`);
      console.log("- CID:", post.cid);
      console.log("- Author:", post.author);
      console.log("- Timestamp:", new Date(Number(post.timestamp) * 1000).toLocaleString());
    }

    console.log("\nOn-Chain Posts:", onChainCounter.toString());
    for (let i = 1; i <= onChainCounter; i++) {
      const post = await contentManagement.onChainPosts(i);
      console.log(`\nPost #${i}:`);
      console.log("- Content:", post.content);
      console.log("- Author:", post.author);
      console.log("- Timestamp:", new Date(Number(post.timestamp) * 1000).toLocaleString());
    }
  } catch (error) {
    console.error("Error fetching posts:", error.message);
  }
  console.log();

  // Check ObjectLifecycle state
  console.log("=== ObjectLifecycle State ===");
  try {
    const tokenCounter = await objectLifecycle.getObjectCount();
    console.log("Total Objects:", tokenCounter.toString());

    for (let i = 1; i <= tokenCounter; i++) {
      const object = await objectLifecycle.objects(i);
      console.log(`\nObject #${i}:`);
      console.log("- Name:", object.name);
      console.log("- Description:", object.description);
      console.log("- IPFS CID:", object.ipfsCID);
      console.log("- Creator:", object.creator);
      console.log("- Owner:", object.owner);
      console.log("- Created:", new Date(Number(object.createdAt) * 1000).toLocaleString());
      console.log("- Status:", ["Active", "Inactive", "Locked"][object.status]);
    }
  } catch (error) {
    console.error("Error fetching objects:", error.message);
  }

  // Check FeeAndTreasury state
  console.log("\n=== FeeAndTreasury State ===");
  try {
    const treasuryAddr = await feeAndTreasury.treasury();
    console.log("Treasury Address:", treasuryAddr);

    // Set a test fee for object creation to verify the contract
    const createObjectSelector = objectLifecycle.interface.getFunction("createObject").selector;
    const objectCreationFee = await feeAndTreasury.getFee(createObjectSelector);
    console.log("Object Creation Fee:", ethers.formatEther(objectCreationFee), "ETH");

    // Additional treasury info
    const owner = await feeAndTreasury.owner();
    console.log("Treasury Owner:", owner);
  } catch (error) {
    console.error("Error fetching fee info:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error inspecting contract state:", error);
    process.exit(1);
  });