# Decentralized Social Media Platform Demo

This document provides an overview of the key features and functionality of our decentralized social media platform, along with demo videos showcasing each feature.

## Table of Contents
1. [Authentication](#authentication)
2. [IPFS Integration](#ipfs-integration)
3. [Blockchain Integration](#blockchain-integration)
4. [Web3.Storage Integration](#web3storage-integration)
5. [DID Integration](#did-integration)

## Authentication

### Login
<video width="800" controls>
  <source src="demo_vids/login.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

- **Features**:
  - Secure login using Web3 authentication
  - DID-based identity verification
  - Seamless wallet connection
  - Session management

### Registration
<video width="800" controls>
  <source src="demo_vids/register.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

- **Features**:
  - New user registration with DID creation
  - Username assignment with IPFS storage
  - Public address association
  - Profile initialization

## IPFS Integration

### Post Creation and Storage
<video width="800" controls>
  <source src="demo_vids/ipfs_post.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

- **Features**:
  - Decentralized content storage
  - Content addressing using IPFS
  - Automatic content replication
  - Content retrieval and display

## Blockchain Integration

### On-Chain Post Storage
<video width="800" controls>
  <source src="demo_vids/blockchain_post.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

- **Features**:
  - Smart contract interaction
  - Post metadata storage on blockchain
  - Transaction verification
  - Immutable post history

## Web3.Storage Integration

### Automatic Content Backup
- **Features**:
  - Automatic content upload to Web3.Storage
  - DID-based authentication for Web3.Storage
  - Content redundancy and availability
  - Cross-platform content access

## DID Integration

### Decentralized Identity
- **Features**:
  - DID creation and management
  - DID-based authentication
  - DID document storage
  - Identity verification across platforms

## Technical Stack

- **Frontend**: Next.js with TypeScript
- **Authentication**: Web3Auth
- **Storage**: IPFS, Web3.Storage
- **Blockchain**: Ethereum (via Smart Contracts)
- **Identity**: DID (Decentralized Identifiers)
- **UI Framework**: Tailwind CSS

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Setup

Required environment variables:
- `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`: Web3Auth client ID
- `NEXT_PUBLIC_WEB3AUTH_NETWORK`: Web3Auth network
- `NEXT_PUBLIC_INFURA_IPFS_PROJECT_ID`: Infura IPFS project ID
- `NEXT_PUBLIC_INFURA_IPFS_PROJECT_SECRET`: Infura IPFS project secret
- `NEXT_PUBLIC_WEB3_STORAGE_TOKEN`: Web3.Storage API token
- `NEXT_PUBLIC_ALCHEMY_API_KEY`: Alchemy API key
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Smart contract address

