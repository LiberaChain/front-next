"use client";

import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Create context
const StateContext = createContext();

// Initial state
const initialState = {
  auth: null,
  profile: null,
  ipfsProfile: null,
  friendRequests: {
    pending: [],
    sent: []
  },
  friends: [],
  blockchainStatus: null,
  ipfsStatus: null
};

// Action types
const ActionTypes = {
  SET_AUTH: 'SET_AUTH',
  CLEAR_AUTH: 'CLEAR_AUTH',
  SET_PROFILE: 'SET_PROFILE',
  SET_IPFS_PROFILE: 'SET_IPFS_PROFILE',
  SET_FRIEND_REQUESTS: 'SET_FRIEND_REQUESTS',
  SET_FRIENDS: 'SET_FRIENDS',
  SET_BLOCKCHAIN_STATUS: 'SET_BLOCKCHAIN_STATUS',
  SET_IPFS_STATUS: 'SET_IPFS_STATUS'
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_AUTH:
      return { ...state, auth: action.payload };
    case ActionTypes.CLEAR_AUTH:
      return { ...state, auth: null, profile: null };
    case ActionTypes.SET_PROFILE:
      return { ...state, profile: action.payload };
    case ActionTypes.SET_IPFS_PROFILE:
      return { ...state, ipfsProfile: action.payload };
    case ActionTypes.SET_FRIEND_REQUESTS:
      return { 
        ...state, 
        friendRequests: {
          pending: action.payload.pending || state.friendRequests.pending,
          sent: action.payload.sent || state.friendRequests.sent
        }
      };
    case ActionTypes.SET_FRIENDS:
      return { ...state, friends: action.payload };
    case ActionTypes.SET_BLOCKCHAIN_STATUS:
      return { ...state, blockchainStatus: action.payload };
    case ActionTypes.SET_IPFS_STATUS:
      return { ...state, ipfsStatus: action.payload };
    default:
      return state;
  }
};

// API functions for server communication
const API = {
  // Store data in server session
  async storeData(key, data) {
    try {
      // Using the fetch API to call our new storage API endpoint
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key,
          data
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to store data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error storing data:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get data from server session
  async getData(key) {
    try {
      const response = await fetch(`/api/storage?action=get&key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting data:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove data from server session
  async removeData(key) {
    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          key
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error removing data:', error);
      return { success: false, error: error.message };
    }
  }
};

// Context provider component
export const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  
  // Initialize state from server session on component mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Load auth data
        const authResponse = await API.getData('liberaChainAuth');
        if (authResponse.success && authResponse.data) {
          // Check if auth has expired
          if (authResponse.data.expiry && authResponse.data.expiry < Date.now()) {
            await API.removeData('liberaChainAuth');
          } else {
            dispatch({ type: ActionTypes.SET_AUTH, payload: authResponse.data });
          }
        }
        
        // Load profile data
        const profileResponse = await API.getData('liberaChainIdentity');
        if (profileResponse.success && profileResponse.data) {
          dispatch({ type: ActionTypes.SET_PROFILE, payload: profileResponse.data });
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize state:', error);
        setIsInitialized(true);
      }
    };
    
    initializeState();
  }, []);
  
  // Auth actions
  const storeAuth = async (authData) => {
    const result = await API.storeData('liberaChainAuth', authData);
    if (result.success) {
      dispatch({ type: ActionTypes.SET_AUTH, payload: authData });
    }
    return result;
  };
  
  const clearAuth = async () => {
    await API.removeData('liberaChainAuth');
    dispatch({ type: ActionTypes.CLEAR_AUTH });
  };
  
  // Profile actions
  const storeProfile = async (profileData) => {
    const result = await API.storeData('liberaChainIdentity', profileData);
    if (result.success) {
      dispatch({ type: ActionTypes.SET_PROFILE, payload: profileData });
    }
    return result;
  };

  // IPFS Profile actions
  const storeIpfsProfile = async (ipfsProfileData) => {
    dispatch({ type: ActionTypes.SET_IPFS_PROFILE, payload: ipfsProfileData });
  };
  
  // Friend request actions
  const storeFriendRequests = async (pendingRequests, sentRequests) => {
    // Store to server for persistence
    if (pendingRequests) {
      await API.storeData('liberaChainPendingRequests', pendingRequests);
    }
    
    if (sentRequests) {
      await API.storeData('liberaChainSentRequests', sentRequests);
    }
    
    // Update state
    dispatch({ 
      type: ActionTypes.SET_FRIEND_REQUESTS, 
      payload: { 
        pending: pendingRequests, 
        sent: sentRequests 
      } 
    });
  };
  
  // Friends list actions
  const storeFriends = async (friends) => {
    const did = state.profile?.did;
    if (!did) return { success: false, error: 'No user profile' };
    
    // Store friendship data with DID as the key
    const result = await API.storeData(`liberaChainFriendships_${did}`, friends);
    
    if (result.success) {
      dispatch({ type: ActionTypes.SET_FRIENDS, payload: friends });
    }
    
    return result;
  };
  
  // Status actions
  const setBlockchainStatus = (status) => {
    dispatch({ type: ActionTypes.SET_BLOCKCHAIN_STATUS, payload: status });
  };
  
  const setIpfsStatus = (status) => {
    dispatch({ type: ActionTypes.SET_IPFS_STATUS, payload: status });
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!state.auth && state.auth.did && state.auth.expiry > Date.now();
  };
  
  // Expose API functions
  const contextValue = {
    state,
    isAuthenticated,
    storeAuth,
    clearAuth,
    storeProfile,
    storeIpfsProfile,
    storeFriendRequests,
    storeFriends,
    setBlockchainStatus,
    setIpfsStatus,
    API,
    isInitialized
  };
  
  return (
    <StateContext.Provider value={contextValue}>
      {children}
    </StateContext.Provider>
  );
};

// Custom hook for accessing context
export const useAppState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};