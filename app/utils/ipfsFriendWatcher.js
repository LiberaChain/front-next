// IPFS Friend Request Watcher
// This service periodically checks for new friend requests in IPFS

import { getFile } from './ipfs-crud';
import { hasIpfsCredentials } from './ipfsService';

// Customizable settings
const CHECK_INTERVAL = 5000; // Check every 5 seconds for faster updates during testing
let watcherInterval = null;

// Initialize the watcher for a specific user
export const initFriendRequestWatcher = (userDid) => {
  if (!userDid) {
    console.error('Cannot start friend request watcher without a user DID');
    return;
  }
  
  // Clear any existing watcher
  stopFriendRequestWatcher();
  
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured. Friend requests require IPFS.');
  }
  
  console.log(`Starting friend request watcher for user: ${userDid}`);
  
  // Do an immediate check
  checkForNewFriendRequests(userDid);
  
  // Set up interval for periodic checks
  watcherInterval = setInterval(() => {
    checkForNewFriendRequests(userDid);
  }, CHECK_INTERVAL);
  
  return () => {
    stopFriendRequestWatcher();
  };
};

// Stop the watcher
export const stopFriendRequestWatcher = () => {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log('Friend request watcher stopped');
  }
};

// Check for new friend requests
const checkForNewFriendRequests = async (userDid) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  try {
    const response = await fetch('/api/storage');
    if (!response.ok) {
      throw new Error('Failed to list IPFS files');
    }

    const listData = await response.json();
    if (!listData.success || !listData.files) {
      throw new Error('Invalid response from IPFS storage');
    }

    // Find all friend request files
    const requestFiles = listData.files.filter(file => file.match(/friend-request.*\.json/));
    console.log(`Found ${requestFiles.length} potential friend request files`);

    let newRequestsFound = false;
    
    // Process each request file
    for (const filename of requestFiles) {
      try {
        const content = await getFile(filename);
        if (!content) continue;

        const requestData = JSON.parse(content);
        
        // Check if this request is for the current user
        if (requestData.to === userDid) {
          // Notify UI of the new request
          dispatchFriendRequestEvent('new-friend-request', requestData);
          newRequestsFound = true;
        }
      } catch (err) {
        console.error('Error processing friend request file:', filename, err);
      }
    }

    if (!newRequestsFound) {
      console.log('No new friend requests found in IPFS');
    }
  } catch (error) {
    console.error('Error checking for friend requests:', error);
    throw error;
  }
};

// Dispatch custom event for friend request notifications
const dispatchFriendRequestEvent = (eventType, data) => {
  if (typeof window !== 'undefined') {
    console.log(`Dispatching ${eventType} event for request from ${data.from} to ${data.to}`);
    
    const event = new CustomEvent('liberachain:friend-request', {
      detail: {
        type: eventType,
        data: data
      }
    });
    
    window.dispatchEvent(event);
  }
};

// Force check for friend requests right now (useful for debugging)
export const forceCheckFriendRequests = (userDid) => {
  if (!userDid) {
    console.error('Cannot check friend requests without a user DID');
    return;
  }
  
  console.log('Forcing check for friend requests...');
  checkForNewFriendRequests(userDid);
};