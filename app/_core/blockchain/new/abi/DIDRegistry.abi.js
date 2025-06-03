export const DIDRegistryABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "newCid", "type": "string" }
        ],
        "name": "CommKeyUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" }
        ],
        "name": "DIDRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "newCid", "type": "string" }
        ],
        "name": "ProfileUpdated",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "bytes", "name": "challenge", "type": "bytes" },
            { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "name": "register",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "cid", "type": "string" }
        ],
        "name": "setCommPubKeyCID",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "cid", "type": "string" }
        ],
        "name": "setProfileCID",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "name": "users",
        "outputs": [
            { "internalType": "bool", "name": "isRegistered", "type": "bool" },
            { "internalType": "string", "name": "profileDataCID", "type": "string" },
            { "internalType": "string", "name": "commPubKeyCID", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];