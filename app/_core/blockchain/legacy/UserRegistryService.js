// file: services/UserRegistryService.js
import { ethers } from "ethers";

const USER_REGISTRY_ABI = [ /* VSTAVITE ABI ZA UserRegistry.sol TUKAJ */ ];

class UserRegistryService {
    constructor(contractAddress, providerOrSigner) {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Invalid contract address provided for UserRegistryService.");
        }
        this.contract = new ethers.Contract(contractAddress, USER_REGISTRY_ABI, providerOrSigner);
    }

    async _ensureSigner() {
        if (!this.contract.runner || !(await this.contract.runner.getAddress())) {
             throw new Error("Signer is required for this operation.");
        }
    }

    // --- Read-only funkcije ---
    async userExists(did) {
        if (typeof did !== 'string' || did.trim() === '') {
            throw new Error("DID must be a non-empty string.");
        }
        try {
            return await this.contract.userExists(did);
        } catch (error) {
            console.error(`Error checking if user ${did} exists:`, error);
            throw error;
        }
    }

    async getUser(did) {
        if (typeof did !== 'string' || did.trim() === '') {
            throw new Error("DID must be a non-empty string.");
        }
        try {
            const userData = await this.contract.getUser(did);
            // Podatki se vrnejo kot array, pretvorimo v objekt za lažjo uporabo
            return {
                exists: userData[0],
                publicKey: userData[1],
                registrationTime: BigInt(userData[2]) // Solidity uint256 -> BigInt
            };
        } catch (error) {
            console.error(`Error fetching user data for ${did}:`, error);
            throw error;
        }
    }

    // --- Write (transakcijske) funkcije ---
    async registerUser(did, publicKey) {
        await this._ensureSigner();
        if (typeof did !== 'string' || did.trim() === '') {
            throw new Error("DID must be a non-empty string for registration.");
        }
        if (typeof publicKey !== 'string' || publicKey.trim() === '') {
            throw new Error("Public key must be a non-empty string for registration.");
        }
        try {
            // Predpostavka: če je za registracijo potrebno plačilo AppTokenov,
            // mora uporabnik najprej odobriti (approve) UserRegistry pogodbi porabo teh žetonov.
            // Ta logika bi bila dodana sem, če bi UserRegistry.sol imel to funkcionalnost.
            // Zaenkrat jo UserRegistry.sol nima.
            const tx = await this.contract.registerUser(did, publicKey);
            console.log("Register User transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Register User transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error registering user ${did}:`, error);
            throw error;
        }
    }

    async updatePublicKey(did, newPublicKey) {
        await this._ensureSigner();
        if (typeof did !== 'string' || did.trim() === '') {
            throw new Error("DID must be a non-empty string for updating public key.");
        }
        if (typeof newPublicKey !== 'string' || newPublicKey.trim() === '') {
            throw new Error("New public key must be a non-empty string.");
        }
        // V pogodbi UserRegistry.sol je updatePublicKey trenutno brez posebne zaščite (npr. onlyOwner).
        // Če bi bila potrebna avtentikacija (npr. samo lastnik DID-a lahko posodobi),
        // bi to zahtevalo podpisano sporočilo (meta-transakcijo) ali pa bi funkcija v pogodbi
        // preverjala msg.sender proti naslovu, povezanem z DID-om.
        try {
            const tx = await this.contract.updatePublicKey(did, newPublicKey);
            console.log("Update Public Key transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Update Public Key transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error updating public key for ${did}:`, error);
            throw error;
        }
    }

    // --- Admin funkcije (za lastnika pogodbe) ---
    async pauseContract() {
        await this._ensureSigner();
        try {
            const tx = await this.contract.pause();
            console.log("Pause transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Contract paused:", receipt);
            return receipt;
        } catch (error) {
            console.error("Error pausing UserRegistry contract:", error);
            throw error;
        }
    }

    async unpauseContract() {
        await this._ensureSigner();
        try {
            const tx = await this.contract.unpause();
            console.log("Unpause transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Contract unpaused:", receipt);
            return receipt;
        } catch (error) {
            console.error("Error unpausing UserRegistry contract:", error);
            throw error;
        }
    }
}
// export default UserRegistryService;