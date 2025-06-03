export const ContentManagementABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_didRegistryAddress", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "cid", "type": "string" }
        ],
        "name": "NewIPFSAnchor",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "author", "type": "address" }
        ],
        "name": "NewOnChainPost",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "didRegistry",
        "outputs": [
            { "internalType": "contract DIDRegistry", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getIPFSAnchorCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getOnChainPostCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "ipfsAnchors",
        "outputs": [
            { "internalType": "string", "name": "cid", "type": "string" },
            { "internalType": "address", "name": "author", "type": "address" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "onChainPosts",
        "outputs": [
            { "internalType": "string", "name": "content", "type": "string" },
            { "internalType": "address", "name": "author", "type": "address" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "cid", "type": "string" },
            { "internalType": "bytes", "name": "authorSignature", "type": "bytes" }
        ],
        "name": "postIPFSAnchor",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "content", "type": "string" }
        ],
        "name": "postOnChain",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];