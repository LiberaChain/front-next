// file: services/AppTokenService.js
import { ethers } from "ethers";

const APP_TOKEN_ABI = [ /* VSTAVITE ABI ZA AppToken.sol TUKAJ */ ];

class AppTokenService {
    constructor(contractAddress, providerOrSigner) {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Invalid contract address provided for AppTokenService.");
        }
        this.contractAddress = contractAddress;
        this.contract = new ethers.Contract(contractAddress, APP_TOKEN_ABI, providerOrSigner);
        // Shranimo si tudi signerja, če je na voljo, za transakcije, ki zahtevajo podpis
        this.signer = providerOrSigner.getSigner ? providerOrSigner : (providerOrSigner.provider ? providerOrSigner.provider.getSigner() : null);
    }

    // --- Read-only funkcije ---
    async getName() {
        try {
            return await this.contract.name();
        } catch (error) {
            console.error("Error fetching token name:", error);
            throw error;
        }
    }

    async getSymbol() {
        try {
            return await this.contract.symbol();
        } catch (error) {
            console.error("Error fetching token symbol:", error);
            throw error;
        }
    }

    async getDecimals() {
        try {
            const decimals = await this.contract.decimals();
            return Number(decimals); // Decimals je običajno majhno število
        } catch (error) {
            console.error("Error fetching token decimals:", error);
            throw error;
        }
    }

    async getTotalSupply() {
        try {
            const supply = await this.contract.totalSupply();
            return supply; // Vrača BigInt
        } catch (error) {
            console.error("Error fetching total supply:", error);
            throw error;
        }
    }

    async getBalance(userAddress) {
        if (!ethers.isAddress(userAddress)) {
            throw new Error("Invalid user address provided for getBalance.");
        }
        try {
            const balance = await this.contract.balanceOf(userAddress);
            return balance; // Vrača BigInt
        } catch (error) {
            console.error(`Error fetching balance for ${userAddress}:`, error);
            throw error;
        }
    }

    async getAllowance(ownerAddress, spenderAddress) {
        if (!ethers.isAddress(ownerAddress) || !ethers.isAddress(spenderAddress)) {
            throw new Error("Invalid owner or spender address provided for getAllowance.");
        }
        try {
            const allowance = await this.contract.allowance(ownerAddress, spenderAddress);
            return allowance; // Vrača BigInt
        } catch (error) {
            console.error(`Error fetching allowance for owner ${ownerAddress} and spender ${spenderAddress}:`, error);
            throw error;
        }
    }

    // --- Write (transakcijske) funkcije ---
    async _ensureSigner() {
        if (!this.contract.runner || !(await this.contract.runner.getAddress())) {
             throw new Error("Signer is required for this operation.");
        }
    }

    async approve(spenderAddress, amount) {
        await this._ensureSigner();
        if (!ethers.isAddress(spenderAddress)) {
            throw new Error("Invalid spender address provided for approve.");
        }
        if (typeof amount !== 'bigint' && typeof amount !== 'string' && typeof amount !== 'number') {
            throw new Error("Invalid amount type for approve. Use BigInt, string, or number.");
        }
        try {
            const tx = await this.contract.approve(spenderAddress, ethers.parseUnits(amount.toString(), await this.getDecimals()));
            console.log("Approve transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Approve transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error approving spender ${spenderAddress} for amount ${amount}:`, error);
            throw error;
        }
    }

    async transfer(toAddress, amount) {
        await this._ensureSigner();
        if (!ethers.isAddress(toAddress)) {
            throw new Error("Invalid recipient address provided for transfer.");
        }
         if (typeof amount !== 'bigint' && typeof amount !== 'string' && typeof amount !== 'number') {
            throw new Error("Invalid amount type for transfer. Use BigInt, string, or number.");
        }
        try {
            const decimals = await this.getDecimals();
            const tx = await this.contract.transfer(toAddress, ethers.parseUnits(amount.toString(), decimals));
            console.log("Transfer transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transfer transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error transferring ${amount} to ${toAddress}:`, error);
            throw error;
        }
    }
    
    // samo lastnik pogodbe (owner)
    async mint(toAddress, amount) {
        await this._ensureSigner();
        if (!ethers.isAddress(toAddress)) {
            throw new Error("Invalid recipient address for minting.");
        }
        if (typeof amount !== 'bigint' && typeof amount !== 'string' && typeof amount !== 'number') {
            throw new Error("Invalid amount type for mint. Use BigInt, string, or number.");
        }
        try {
            const decimals = await this.getDecimals();
            const tx = await this.contract.mint(toAddress, ethers.parseUnits(amount.toString(), decimals));
            console.log("Mint transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Mint transaction confirmed:", receipt);
            return receipt;
        } catch (error) {
            console.error(`Error minting ${amount} to ${toAddress}:`, error);
            throw error;
        }
    }
}
// export default AppTokenService; // Če uporabljate module