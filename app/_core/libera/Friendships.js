import { FilebaseIPFSProvider } from "../storage/ipfs/FilebaseIPFSService";

export class Friendships {
    static async getPendingRequestsDids(userDid) {
        try {
            const ipfs = FilebaseIPFSProvider.getInstance();
            const pendingRequests = await ipfs.listDirectory(`friendships/${userDid}/pending`);

            if (!pendingRequests || pendingRequests.length === 0) {
                return [];
            }

            console.log("Pending friendship requests for user:", userDid, pendingRequests);

            const pendingDids = pendingRequests.map(file => {
                const parts = file.Key.split('/');
                return parts[parts.length - 1].replace('.json', ''); // Extract the DID from the file path
            });

            console.debug("Pending friendship requests for DID:", userDid, pendingDids);

            return pendingDids;

        } catch (error) {
            console.error("Error fetching pending friendship requests:", error);
            throw new Error("Failed to fetch pending friendship requests.");
        }
    }

    static async getFriendsDids(userDid) {
        try {
            const ipfs = FilebaseIPFSProvider.getInstance();
            const friendsList = await ipfs.listDirectory(`friendships/${userDid}/friends`);

            if (!friendsList || friendsList.length === 0) {
                return [];
            }

            const friendsDids = friendsList.map(file => {
                const parts = file.Key.split('/');
                return parts[parts.length - 1].replace('.json', ''); // Extract the DID from the file path
            });

            console.debug("Friends DIDs for user:", userDid, friendsDids);

            return friendsDids;

        } catch (error) {
            console.error("Error fetching friends DIDs:", error);
            throw new Error("Failed to fetch friends DIDs.");
        }
    }

    static async addFriendRequest(userDid, friendDid) {
        if (!userDid || !friendDid) {
            throw new Error("Both user DID and friend DID are required.");
        }

        if (userDid === friendDid) {
            throw new Error("Cannot send a friend request to yourself.");
        }

        try {
            const ipfs = FilebaseIPFSProvider.getInstance();
            const filePath = `friendships/${friendDid}/pending/${userDid}.json`;
            const content = JSON.stringify({
                users: [
                    friendDid,
                    userDid
                ], status: "pending"
            });

            await ipfs.uploadFile(filePath, content);
            console.debug("Friend request added:", filePath);

        } catch (error) {
            console.error("Error adding friend request:", error);
            throw new Error("Failed to add friend request.");
        }
    }

    static async acceptFriendRequest(userDid, friendDid) {
        try {
            const ipfs = FilebaseIPFSProvider.getInstance();
            const pendingPath = `friendships/${userDid}/pending/${friendDid}.json`;
            const friendsPath = `friendships/${userDid}/friends/${friendDid}.json`;
            const reversePath = `friendships/${friendDid}/friends/${userDid}.json`;

            // Move from pending to friends
            const cid = await ipfs.getLatestCID(pendingPath);
            if (!cid) {
                throw new Error("Pending request was not found.");
            }

            let content = await ipfs.fetchFileByCID(cid);
            if (!content) {
                throw new Error("Failed to fetch pending request content.");
            }

            content = JSON.parse(await content.text());
            content.status = "accepted";

            await ipfs.uploadFile(friendsPath, content);
            await ipfs.uploadFile(reversePath, content);
            await ipfs.deleteFile(pendingPath);

            console.debug("Friend request accepted:", friendDid);

        } catch (error) {
            console.error("Error accepting friend request:", error);
            throw new Error("Failed to accept friend request.");
        }
    }
}