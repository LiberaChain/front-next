# LiberaChain - Reclaim Your Digital Freedom

![LiberaChain](public/logo-dark.svg)

## Take Back Control of Your Digital Identity

**LiberaChain** is a revolutionary decentralized social network built on blockchain technology that gives users complete ownership of their digital identity, data, and social connections. In a world where centralized platforms exploit your personal information, LiberaChain puts you back in control.

### 🌐 Key Features

- **True Data Ownership**: Your data lives on the blockchain and IPFS, not corporate servers
- **Censorship Resistant**: No central authority can silence your voice
- **Self-Sovereign Identity**: Blockchain-verified identity without sharing personal details
- **Encrypted P2P Messaging**: Direct, encrypted communication with your connections
- **Decentralized Posts & Content**: Share without Big Tech's algorithms filtering your reach
- **Wallet-Based Authentication**: Simple login using your blockchain wallet - no passwords
- **QR-Code Connections**: Easily connect with others in person through secure QR codes

### 🔧 Tech Stack

Built with cutting-edge technology:
- **Next.js**: React framework for the frontend
- **Ethereum/Hardhat**: Smart contracts for identity management
- **IPFS**: Decentralized storage for user content
- **Ethers.js**: Blockchain interactions
- **MetaMask Integration**: Seamless wallet connection

## 🚀 Complete Local Deployment Guide

Follow these steps to set up and run your own instance of LiberaChain:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MetaMask](https://metamask.io/) or another Ethereum wallet browser extension
- Git

### Step 1: Clone the repository

```bash
git clone https://github.com/yourusername/liberachain.git
cd liberachain/front-next
```

### Step 2: Install dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Set up the local blockchain

The project uses Hardhat for local blockchain development:

1. Start the local Hardhat network:

```bash
npx hardhat node
```

This will start a local Ethereum network and create several test accounts with ETH. Keep this terminal window open.

2. In a new terminal, deploy the smart contracts to your local network:

```bash
# Compile the contracts
npx hardhat compile

# Deploy the contracts to the local network
npx hardhat run blockchain/scripts/deploy.js --network localhost
```

You should see output like:
```
Starting deployment of contracts...
Deploying UserPublicKeys contract...
UserPublicKeys deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Deploying UserRegistry contract...
UserRegistry deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Contract addresses saved to blockchain/artifacts/contracts/contract-address.json
```

### Step 4: Configure MetaMask to use local network

1. Open MetaMask in your browser
2. Add a new network with the following details:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545/
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import a test account:
   - In the terminal where Hardhat is running, copy one of the private keys
   - In MetaMask, click "Import Account" and paste the private key

### Step 5: Configure environment variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Note: Replace the contract addresses with the ones from your deployment if they differ.

### Step 6: Start the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Step 7: Explore LiberaChain Features

#### Creating Your Decentralized Identity
1. Visit http://localhost:3000/registration
2. Connect your MetaMask wallet (make sure you're on the Hardhat Local network)
3. Complete the registration process
4. The system will generate a cryptographic key pair and register your public key on the blockchain

#### Accessing Your Decentralized Profile
1. Visit http://localhost:3000/login
2. Connect the same wallet
3. The system will verify your blockchain registration
4. After successful verification, you'll be redirected to your personal dashboard

#### Making Connections
- Use the Friends feature to connect with other users
- Generate and scan QR codes to connect in person
- Accept or reject incoming connection requests

#### Sharing Content
- Create posts that are stored on IPFS and referenced on the blockchain
- Your content cannot be censored or removed by any central authority
- Like, comment, and share posts from your connections

#### Private Messaging
- Send end-to-end encrypted messages to your connections
- Your conversations are completely private and secure

## 🛠️ Troubleshooting

### MetaMask Connection Issues
- Make sure your MetaMask is on the Hardhat Local network
- Ensure the RPC URL is correctly set to http://127.0.0.1:8545
- Restart your browser if issues persist

### Contract Deployment Issues
- If contracts fail to deploy, try resetting your Hardhat node:
  ```bash
  # Stop the current node (Ctrl+C)
  # Clear the artifacts
  rm -rf blockchain/artifacts
  # Start a fresh node
  npx hardhat node
  ```
- Then redeploy the contracts:
  ```bash
  npx hardhat compile
  npx hardhat run blockchain/scripts/deploy.js --network localhost
  ```

### Transaction Errors
If you see errors about transactions failing:
- Check if you have enough ETH in your test account
- Make sure the contract addresses in your .env.local file match the deployed ones
- Check the Hardhat console for error details

## 🤝 Contributing

We welcome contributions to LiberaChain! Whether you're fixing bugs, adding features, or improving documentation, please feel free to make a pull request.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Hardhat Documentation](https://hardhat.org/getting-started/) - learn about Ethereum development with Hardhat
- [IPFS Documentation](https://docs.ipfs.io/) - learn about the InterPlanetary File System
- [ethers.js Documentation](https://docs.ethers.io/) - learn about the ethers.js library
- [DID Documentation](https://w3c-ccg.github.io/did-primer/) - learn about Decentralized Identifiers

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Join the decentralized revolution with LiberaChain - where your data belongs to you, and only you.
