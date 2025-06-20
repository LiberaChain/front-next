// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserPublicKeys {
    // Mapping of user IDs to their public keys
    mapping(string => string) private userPublicKeys;
    
    // Event emitted when a public key is set
    event PublicKeySet(string indexed userId, string publicKey);
    
    // Function to set a user's public key
    function setPublicKey(string memory userId, string memory publicKey) public {
        userPublicKeys[userId] = publicKey;
        emit PublicKeySet(userId, publicKey);
    }
    
    // Function to get a user's public key
    function getPublicKey(string memory userId) public view returns (string memory) {
        return userPublicKeys[userId];
    }
    
    // Function to check if a user's public key exists
    function publicKeyExists(string memory userId) public view returns (bool) {
        bytes memory publicKeyBytes = bytes(userPublicKeys[userId]);
        return publicKeyBytes.length > 0;
    }
}
