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
[![Login Demo](demo_vids/login_thumbnail.png)](demo_vids/login.mp4)

- **Features**:
  - Secure login using Web3 authentication
  - DID-based identity verification
  - Seamless wallet connection
  - Session management

### Registration
[![Registration Demo](demo_vids/register_thumbnail.png)](demo_vids/register.mp4)

- **Features**:
  - New user registration with DID creation
  - Username assignment with IPFS storage
  - Public address association
  - Profile initialization

## IPFS Integration

### Post Creation and Storage
[![IPFS Post Demo](demo_vids/ipfs_post_thumbnail.png)](demo_vids/ipfs_post.mp4)

- **Features**:
  - Decentralized content storage
  - Content addressing using IPFS
  - Automatic content replication
  - Content retrieval and display

## Blockchain Integration

### On-Chain Post Storage
[![Blockchain Post Demo](demo_vids/blockchain_post_thumbnail.png)](demo_vids/blockchain_post.mp4)

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
