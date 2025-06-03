export const ObjectLifecycleABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_didRegistryAddress", "type": "address" },
            { "internalType": "address", "name": "_feeContractAddress", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "objectId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" }
        ],
        "name": "InteractionRecorded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "objectId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "creator", "type": "address" }
        ],
        "name": "ObjectCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "objectId", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" }
        ],
        "name": "ObjectOwnershipTransferred",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "metadataCID", "type": "string" },
            { "internalType": "bytes32", "name": "pubKeyX", "type": "bytes32" },
            { "internalType": "bytes32", "name": "pubKeyY", "type": "bytes32" }
        ],
        "name": "createObject",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
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
        "name": "feeContract",
        "outputs": [
            { "internalType": "contract IFeeAndTreasury", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "objects",
        "outputs": [
            { "internalType": "address", "name": "creator", "type": "address" },
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "string", "name": "metadataCID", "type": "string" },
            { "internalType": "bytes32", "name": "pubKeyX", "type": "bytes32" },
            { "internalType": "bytes32", "name": "pubKeyY", "type": "bytes32" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "objectId", "type": "uint256" },
            { "internalType": "bytes32", "name": "interactionClaimHash", "type": "bytes32" },
            { "internalType": "bytes", "name": "userSignature", "type": "bytes" }
        ],
        "name": "recordInteraction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "objectId", "type": "uint256" },
            { "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "transferObjectOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getObjectCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];