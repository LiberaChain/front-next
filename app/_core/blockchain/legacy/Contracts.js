// file: ethersSetup.js (primer nastavitve providerja in signerja)
import { ethers } from "ethers";

// Povezava na Ethereum vozlišče (npr. Hardhat Network, Infura, Alchemy)
// Za branje podatkov
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545"); // Prilagodite URL

// Za pošiljanje transakcij (potrebuje zasebni ključ ali povezavo z denarnico kot MetaMask)
// PRIMER: Uporaba zasebnega ključa (NE UPORABLJAJTE V PRODUKCIJSKEM FRONTENDU!)
// const privateKey = "0x..."; // Vaš zasebni ključ
// const signer = new ethers.Wallet(privateKey, provider);

// ALI (bolj pogosto za frontend): Pridobivanje signerja iz brskalniške denarnice (MetaMask)
// let signer = null;
// if (typeof window.ethereum !== 'undefined') {
//     const browserProvider = new ethers.BrowserProvider(window.ethereum);
//     signer = await browserProvider.getSigner();
// } else {
//     console.log("MetaMask ni na voljo. Uporabljam read-only provider.");
// }
// const G_PROVIDER_OR_SIGNER = signer || provider; // Uporabi signerja, če je na voljo, sicer provider

// export { G_PROVIDER_OR_SIGNER, provider, signer }; // Izvozi po potrebi
