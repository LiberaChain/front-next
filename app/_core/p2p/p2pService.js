// import { generateAsymmetricKeys, retrieveMessagingKeys } from './blockchainTransactions';
// import { Libp2p } from 'libp2p';
// import { WebSockets } from '@libp2p/websockets';
// import { Noise } from '@chainsafe/libp2p-noise';
// import { Mplex } from '@libp2p/mplex';
// import { createFromJSON } from '@libp2p/peer-id-factory';
// import { pipe } from 'it-pipe';
// import { fromString, toString } from 'uint8arrays';

// let node = null;
// let connectedPeers = new Map();

// // Initialize the p2p node
// export const initP2PNode = async () => {
//     try {
//         // Get or generate messaging keys
//         let keys = retrieveMessagingKeys();
//         if (!keys) {
//             keys = await generateAsymmetricKeys();
//         }

//         // Create the libp2p node
//         node = await Libp2p.create({
//             addresses: {
//                 listen: ['/ip4/0.0.0.0/tcp/0/ws'] // Let the system assign a port
//             },
//             transports: [new WebSockets()],
//             connectionEncryption: [new Noise()],
//             streamMuxers: [new Mplex()],
//             connectionManager: {
//                 minConnections: 0,
//                 maxConnections: 50,
//             }
//         });

//         // Start the node
//         await node.start();
//         console.log('P2P node started');

//         // Handle incoming messages
//         node.handle('/chat/1.0.0', async ({ stream }) => {
//             try {
//                 const message = await pipe(
//                     stream,
//                     async function* (source) {
//                         for await (const data of source) {
//                             yield toString(data.subarray());
//                         }
//                     }
//                 );
                
//                 // Parse the message
//                 const { from, text, timestamp } = JSON.parse(message);
                
//                 // Emit the message to subscribers
//                 if (messageHandlers.size > 0) {
//                     messageHandlers.forEach(handler => {
//                         handler({
//                             sender: from,
//                             text,
//                             timestamp,
//                             id: Date.now()
//                         });
//                     });
//                 }
//             } catch (err) {
//                 console.error('Error handling incoming message:', err);
//             }
//         });

//         return node.peerId.toString();
//     } catch (err) {
//         console.error('Failed to initialize P2P node:', err);
//         throw err;
//     }
// };

// // Message handlers for receiving messages
// const messageHandlers = new Map();

// // Subscribe to incoming messages
// export const subscribeToMessages = (conversationId, handler) => {
//     messageHandlers.set(conversationId, handler);
//     return () => messageHandlers.delete(conversationId);
// };

// // Connect to a peer
// export const connectToPeer = async (peerId) => {
//     try {
//         if (!node) {
//             throw new Error('P2P node not initialized');
//         }

//         // Already connected?
//         if (connectedPeers.has(peerId)) {
//             return connectedPeers.get(peerId);
//         }

//         const connection = await node.dial(peerId);
//         connectedPeers.set(peerId, connection);
//         return connection;
//     } catch (err) {
//         console.error('Failed to connect to peer:', err);
//         throw err;
//     }
// };

// // Send a message to a peer
// export const sendMessage = async (peerId, message) => {
//     try {
//         if (!node) {
//             throw new Error('P2P node not initialized');
//         }

//         let connection = connectedPeers.get(peerId);
//         if (!connection) {
//             connection = await connectToPeer(peerId);
//         }

//         const stream = await connection.newStream('/chat/1.0.0');
        
//         // Format the message
//         const messageData = JSON.stringify({
//             from: node.peerId.toString(),
//             text: message,
//             timestamp: new Date().toISOString()
//         });

//         await pipe(
//             [fromString(messageData)],
//             stream
//         );

//         return true;
//     } catch (err) {
//         console.error('Failed to send message:', err);
//         throw err;
//     }
// };

// // Clean up p2p connections
// export const cleanup = async () => {
//     if (node) {
//         for (const [peerId, connection] of connectedPeers) {
//             try {
//                 await connection.close();
//             } catch (err) {
//                 console.error(`Error closing connection to ${peerId}:`, err);
//             }
//         }
//         connectedPeers.clear();
//         await node.stop();
//         node = null;
//     }
// };