import { FilebaseIPFSProvider } from '@core/storage/ipfs/FilebaseIPFSService';

// We need stable way to access from both sides, so sort by DID
function getUserPair(userDid, friendDid) {
    return {
        user1: userDid < friendDid ? userDid : friendDid,
        user2: userDid < friendDid ? friendDid : userDid
    };
}

export class Messages {
    static async getMessages(userDid, friendDid) {
        try {
            if (!userDid || !friendDid) {
                throw new Error("Both user DID and friend DID are required.");
            }

            const { user1, user2 } = getUserPair(userDid, friendDid);

            const ipfs = FilebaseIPFSProvider.getInstance();
            const messagesPath = `messages/${user1}/${user2}`;
            const messagesList = await ipfs.listDirectory(messagesPath);

            if (!messagesList || messagesList.length === 0) {
                return [];
            }

            console.debug("Messages between", userDid, "and", friendDid, ":", messagesList);

            let messagesFileCache = localStorage.getItem('liberaChainMessages');
            messagesFileCache = messagesFileCache ? JSON.parse(messagesFileCache) : {};

            const messages = await Promise.all(messagesList.map(async (file) => {
                if (messagesFileCache[file.Key]) {
                    return messagesFileCache[file.Key];
                }

                const messageCID = await ipfs.getLatestCID(file.Key);
                const response = await ipfs.fetchFileByCID(messageCID);

                const message = JSON.parse(await response.text());
                messagesFileCache[file.Key] = message;

                return message;
            }));

            localStorage.setItem('liberaChainMessages', JSON.stringify(messagesFileCache));

            return messages;
        } catch (error) {
            console.error("Error fetching messages:", error);
            throw new Error("Failed to fetch messages.");
        }
    }

    static async sendMessage(userDid, friendDid, messageContent) {
        if (!userDid || !friendDid || !messageContent) {
            throw new Error("User DID, friend DID, and message content are required.");
        }

        const { user1, user2 } = getUserPair(userDid, friendDid);

        try {
            const ipfs = FilebaseIPFSProvider.getInstance();
            const timestamp = new Date().toISOString();
            const message = {
                from: userDid,
                to: friendDid,
                content: messageContent,
                timestamp: timestamp
            };

            const fileName = `${timestamp}-${userDid}.json`;
            const filePath = `messages/${user1}/${user2}/${fileName}`;
            message.path = filePath;

            await ipfs.uploadFile(filePath, JSON.stringify(message));

            // Update local cache
            let messagesFileCache = localStorage.getItem('liberaChainMessages');
            messagesFileCache = messagesFileCache ? JSON.parse(messagesFileCache) : {};
            messagesFileCache[filePath] = message;
            localStorage.setItem('liberaChainMessages', JSON.stringify(messagesFileCache));

            console.debug("Message sent from", userDid, "to", friendDid, ":", message);

            return message;
        } catch (error) {
            console.error("Error sending message:", error);
            throw new Error("Failed to send message.");
        }
    }
};
