const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment of contracts...");

    // Get the signer's wallet info for later user registration
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Get the contract factories
    const UserPublicKeys = await ethers.getContractFactory("UserPublicKeys");
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    const BlockchainPosts = await ethers.getContractFactory("BlockchainPosts");

    // Deploy contracts
    console.log("Deploying UserPublicKeys contract...");
    const userPublicKeys = await UserPublicKeys.deploy();
    await userPublicKeys.waitForDeployment();
    console.log("UserPublicKeys deployed to:", await userPublicKeys.getAddress());

    console.log("Deploying UserRegistry contract...");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    console.log("UserRegistry deployed to:", await userRegistry.getAddress());

    console.log("Deploying BlockchainPosts contract...");
    const blockchainPosts = await BlockchainPosts.deploy();
    await blockchainPosts.waitForDeployment();
    console.log("BlockchainPosts deployed to:", await blockchainPosts.getAddress());

    // Generate DID for the deployer
    const deployerDid = `did:ethr:${deployer.address}`;
    console.log("Deployer DID:", deployerDid);

    // The deployer's public key can be derived from their address
    // For simplicity, we'll use the wallet address with a prefix as a mock public key
    const deployerPublicKey = `0x${deployer.address.substring(2)}`;

    // Register the deployer as a user in UserPublicKeys contract
    console.log("Registering deployer in UserPublicKeys contract...");
    const pkTx = await userPublicKeys.setPublicKey(deployerDid, deployerPublicKey);
    await pkTx.wait();
    console.log("Deployer registered in UserPublicKeys contract");

    // Register the deployer in UserRegistry contract
    console.log("Registering deployer in UserRegistry contract...");
    const registryTx = await userRegistry.registerUser(deployerDid, deployerPublicKey);
    await registryTx.wait();
    console.log("Deployer registered in UserRegistry contract");

    // Save contract addresses and ABIs for frontend usage
    const fs = require("fs");
    const contractsDir = __dirname + "/../artifacts/contracts";

    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }

    fs.writeFileSync(
        contractsDir + "/contract-address.json",
        JSON.stringify({
            UserPublicKeys: await userPublicKeys.getAddress(),
            UserRegistry: await userRegistry.getAddress(),
            BlockchainPosts: await blockchainPosts.getAddress(),
            DeployerInfo: {
                address: deployer.address,
                did: deployerDid
            }
        }, undefined, 2)
    );

    console.log("Contract addresses saved to blockchain/artifacts/contracts/contract-address.json");
    console.log("Deployer account automatically registered with DID:", deployerDid);
}

// Execute deploy function and handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error deploying contracts:", error);
        process.exit(1);
    });
