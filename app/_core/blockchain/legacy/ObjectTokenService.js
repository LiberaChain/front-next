// file: services/ObjectTokenService.js
import { ethers } from "ethers";

const OBJECT_TOKEN_ABI = [ /* VSTAVITE ABI ZA ObjectToken.sol TUKAJ */ ];

// JavaScript ekvivalent Solidity enuma za lažjo uporabo
const RedemptionMethod = {
    Burn: 0,
    TransferToCreator: 1,
    TransferToSpecificAddress: 2
};

class ObjectTokenService {
    constructor(contractAddress, providerOrSigner) {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Invalid contract address provided for ObjectTokenService.");
        }
        this.contract = new ethers.Contract(contractAddress, OBJECT_TOKEN_ABI, providerOrSigner);
    }

    async _ensureSigner() {
        if (!this.contract.runner || !(await this.contract.runner.getAddress())) {
             throw new Error("Signer is required for this operation.");
        }
    }

    // --- Read-only funkcije ---
    async getTokenTypeDetails(tokenId) {
        if (typeof tokenId !== 'bigint' && typeof tokenId !== 'number' && typeof tokenId !== 'string') {
            throw new Error("Token ID must be a BigInt, number or string.");
        }
        try {
            const details = await this.contract.tokenTypeDetails(BigInt(tokenId));
            // Pretvorba v bolj prijazen objekt
            return {
                creator: details[0],
                maxSupply: BigInt(details[1]),
                currentMintedAmount: BigInt(details[2]),
                isNFTLike: details[3],
                tokenURI: details[4],
                maxTokensPerUser: BigInt(details[5]),
                cooldownPeriodSeconds: BigInt(details[6]),
                redemptionMethod: Number(details[7]), // Enum se vrne kot število
                redemptionAddress: details[8]
            };
        } catch (error) {
            console.error(`Error fetching token type details for ID ${tokenId}:`, error);
            throw error;
        }
    }

    async getBalance(userAddress, tokenId) {
        if (!ethers.isAddress(userAddress)) {
            throw new Error("Invalid user address for getBalance.");
        }
        if (typeof tokenId !== 'bigint' && typeof tokenId !== 'number' && typeof tokenId !== 'string') {
            throw new Error("Token ID must be a BigInt, number or string.");
        }
        try {
            const balance = await this.contract.balanceOf(userAddress, BigInt(tokenId));
            return balance; // BigInt
        } catch (error) {
            console.error(`Error fetching balance for user ${userAddress}, token ID ${tokenId}:`, error);
            throw error;
        }
    }

    async getUri(tokenId) {
        if (typeof tokenId !== 'bigint' && typeof tokenId !== 'number' && typeof tokenId !== 'string') {
            throw new Error("Token ID must be a BigInt, number or string.");
        }
        try {
            return await this.contract.uri(BigInt(tokenId));
        } catch (error) {
            console.error(`Error fetching URI for token ID ${tokenId}:`, error);
            throw error;
        }
    }

    async getLastAcquiredTimestamp(tokenId, userAddress) {
         if (typeof tokenId !== 'bigint' && typeof tokenId !== 'number' && typeof tokenId !== 'string') {
            throw new Error("Token ID must be a BigInt, number or string.");
        }
        if (!ethers.isAddress(userAddress)) {
            throw new Error("Invalid user address for getLastAcquiredTimestamp.");
        }
        try {
            const timestamp = await this.contract.lastAcquiredTimestamp(BigInt(tokenId), userAddress);
            return BigInt(timestamp);
        } catch (error) {
            console.error(`Error fetching last acquired timestamp for token ${tokenId}, user ${userAddress}:`, error);
            throw error;
        }
    }

    // --- Write (transakcijske) funkcije ---

    // Samo lastnik pogodbe
    async createTokenType(params) {
        await this._ensureSigner();
        // Validacija parametrov
        if (!ethers.isAddress(params.creator)) throw new Error("Invalid creator address.");
        if (params.redemptionMethod === RedemptionMethod.TransferToSpecificAddress && !ethers.isAddress(params.redemptionAddress)) {
            throw new Error("Redemption address required for TransferToSpecificAddress method.");
        }
        // ... dodatne validacije za _maxSupply, _maxTokensPerUser, _cooldownPeriodSeconds (npr. da so števila)

        try {
            const tx = await this.contract.createTokenType(
                params.creator,
                BigInt(params.maxSupply),
                params.tokenURI,
                params.isNFTLike,
                BigInt(params.maxTokensPerUser),
                BigInt(params.cooldownPeriodSeconds),
                params.redemptionMethod, // Pošlji številsko vrednost enuma
                params.redemptionAddress || ethers.ZeroAddress // Pošlji ZeroAddress, če ni relevantno
            );
            console.log("Create Token Type transaction sent:", tx.hash);
            const receipt = await tx.wait();
            // Lahko preberete dogodek TokenTypeCreated iz receipt.logs za pridobitev novega tokenId
            // Primer (zahteva ABI eventa):
            // const iface = new ethers.Interface(OBJECT_TOKEN_ABI);
            // const log = receipt.logs.find(l => l.topics[0] === iface.getEvent("TokenTypeCreated").topicHash);
            // const parsedLog = iface.parseLog(log);
            // const newTokenId = parsedLog.args.tokenId;
            console.log("Create Token Type transaction confirmed. Receipt:", receipt);
            return receipt; // V idealnem primeru vrne tudi newTokenId
        } catch (error) {
            console.error("Error creating token type:", error);
            throw error;
        }
    }

    // Kliče kreator tipa žetona ali lastnik pogodbe
    async mintTokens(toAddress, tokenId, amount, data = "0x") {
        await this._ensureSigner();
        if (!ethers.isAddress(toAddress)) throw new Error("Invalid recipient address for minting.");
        // ... validacije za tokenId, amount ...

        try {
            const tx = await this.contract.mintTokens(toAddress, BigInt(tokenId), BigInt(amount), data);
            console.log(`Mint Tokens (ID: ${tokenId}) transaction sent:`, tx.hash);
            const receipt = await tx.wait();
            console.log("Mint Tokens transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error minting ${amount} of token ID ${tokenId} to ${toAddress}:`, error);
            throw error;
        }
    }

    // Kliče uporabnik (msg.sender v pogodbi)
    async redeemTokens(tokenId, amount, data = "0x") {
        await this._ensureSigner();
        // ... validacije za tokenId, amount ...

        try {
            const tx = await this.contract.redeemTokens(BigInt(tokenId), BigInt(amount), data);
            console.log(`Redeem Tokens (ID: ${tokenId}) transaction sent:`, tx.hash);
            const receipt = await tx.wait();
            console.log("Redeem Tokens transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error redeeming ${amount} of token ID ${tokenId}:`, error);
            throw error;
        }
    }
    
    // --- Admin funkcije ---
    async pauseContract() {
        // ... (podobno kot v UserRegistryService)
    }
    async unpauseContract() {
        // ... (podobno kot v UserRegistryService)
    }
    async setBaseURI(newBaseURI) {
        await this._ensureSigner();
        if (typeof newBaseURI !== 'string') throw new Error("New base URI must be a string.");
        try {
            const tx = await this.contract.setBaseURI(newBaseURI);
            // ... čakanje na receipt ...
            return tx;
        } catch (error) {
            console.error("Error setting base URI:", error);
            throw error;
        }
    }
    async updateTokenTypeDetails(tokenId, params) {
        await this._ensureSigner();
        // ... obsežna validacija za tokenId in vse parametre v params ...
        try {
            const tx = await this.contract.updateTokenTypeDetails(
                BigInt(tokenId),
                params.newCreator,
                BigInt(params.newMaxSupply),
                params.newTokenURI,
                params.newIsNFTLike,
                BigInt(params.newMaxTokensPerUser),
                BigInt(params.newCooldownPeriodSeconds),
                params.newRedemptionMethod,
                params.newRedemptionAddress || ethers.ZeroAddress
            );
             // ... čakanje na receipt ...
            return tx;
        } catch (error) {
            console.error(`Error updating token type ${tokenId}:`, error);
            throw error;
        }
    }
}

// Izvozi RedemptionMethod enum skupaj z razredom za lažjo uporabo
// export { ObjectTokenService, RedemptionMethod };