import { FilebaseIPFSProvider } from "@core/storage/ipfs/FilebaseIPFSService";

export class Profiles {
    static async getProfile(did, allowCached = false) {
        if (!did) {
            throw new Error("DID is required to get a profile.");
        }

        if (allowCached) {
            const cachedProfiles = localStorage.getItem('liberaChainProfiles');
            if (cachedProfiles) {
                const profiles = JSON.parse(cachedProfiles);
                if (profiles[did]) {
                    console.debug(`Profile fetched from cache for DID ${did}`, profiles[did]);
                    return profiles[did];
                }
            }
        }

        const ipfs = FilebaseIPFSProvider.getInstance();
        const cid = await ipfs.getLatestCID(`profiles/${did}`);

        if (cid) {
            const response = await ipfs.fetchFileByCID(cid);
            const profileData = JSON.parse(await response.text());

            console.debug(`Profile fetched for DID ${did}. IPFS CID: ${cid}`, profileData);

            profileData.cid = cid;

            // Cache
            const cachedProfiles = localStorage.getItem('liberaChainProfiles');
            const profiles = cachedProfiles ? JSON.parse(cachedProfiles) : {};
            profiles[did] = profileData;
            localStorage.setItem('liberaChainProfiles', JSON.stringify(profiles));
            console.debug(`Profile cached for DID ${did}`, profileData);

            return profileData;
        }

        return null;
    }

    static async saveProfile(did, profileData) {
        if (!did || !profileData) {
            throw new Error("DID and profile data are required to save a profile.");
        }

        // Convert profile data to JSON string
        const profileJson = JSON.stringify(profileData);

        // Upload to IPFS
        const ipfs = FilebaseIPFSProvider.getInstance();
        const response = await ipfs.uploadFile(`profiles/${did}`, profileJson, 'application/json');

        console.debug(`Profile saved for DID ${did}. IPFS response:`, response);

        const ETag = response.ETag;

        // Save the CID in the local storage or database if needed
        // localStorage.setItem(`profile:${did}`, JSON.stringify(profileData));

        return ETag;
    }

}