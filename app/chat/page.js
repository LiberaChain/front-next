'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import './chat.css';
import { getUserProfileFromIPFS, searchUserByDid } from '../utils/blockchainTransactions';

// Mocked data for initial demo conversations
const mockConversations = [
  { id: 1, name: 'Alice', lastMessage: 'Hey, how\'s it going?', timestamp: '10:30 AM' },
  { id: 2, name: 'Bob', lastMessage: 'Well hey, at least we\'re both contributing in our own special ways.', timestamp: '9:15 AM' },
  { id: 3, name: 'Charlie', lastMessage: 'Check this out!', timestamp: 'Yesterday' },
];

// Demo messages for initial conversations
const initialMessages = {
  1: [
    { id: 1, sender: 'Alice', text: 'Hey, how\'s it going?', timestamp: '10:30 AM' },
    { id: 2, sender: 'You', text: 'Pretty good, you?', timestamp: '10:32 AM' },
  ],
  2: [
    { id: 1, sender: 'Bob', text: 'Hey, saw your slides... bold choice of font.', timestamp: '9:15 AM' },
    { id: 2, sender: 'You', text: 'Thanks! I figured readability was less important than making a statement.', timestamp: '9:17 AM' },
    { id: 3, sender: 'Bob', text: 'Totally. And you really made a *statement* not showing up to the 8am stand-up.', timestamp: '9:18 AM' },
    { id: 4, sender: 'You', text: 'Oh, was that today? I guess I was busy fixing the bug you "closed" yesterday.', timestamp: '9:20 AM' },
    { id: 5, sender: 'Bob', text: 'Well hey, at least we\'re both contributing in our own special ways.', timestamp: '9:22 AM' },
    { id: 6, sender: 'You', text: 'Absolutely. Some of us just do it during work hours.', timestamp: '9:24 AM' },
  ],
  3: [
    { id: 1, sender: 'Charlie', text: 'Check this out!', timestamp: 'Yesterday' },
    { id: 2, sender: 'You', text: 'Looks cool!', timestamp: 'Yesterday' },
  ],
};

export default function Home() {
  const router = useRouter();
  const [isToggled, setIsToggled] = useState(false);
  const [qrIsVisible, setQrIsVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [messages, setMessages] = useState(initialMessages);
  const [conversations, setConversations] = useState(mockConversations);
  const [initialized, setInitialized] = useState(false);
  const [showingRealFriends, setShowingRealFriends] = useState(false);

  // Check authentication and load user data
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if user is authenticated
        const authData = localStorage.getItem('liberaChainAuth');
        const profileData = localStorage.getItem('liberaChainIdentity');
        
        if (!authData) {
          // User is not authenticated, redirect to login
          router.push('/login');
          return;
        }
        
        const auth = JSON.parse(authData);
        
        // Check if auth has expired
        if (auth.expiry && auth.expiry < Date.now()) {
          // Auth expired, redirect to login
          localStorage.removeItem('liberaChainAuth');
          router.push('/login');
          return;
        }
        
        // Load user profile data
        if (profileData) {
          const parsedProfile = JSON.parse(profileData);
          setProfileData(parsedProfile);
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  // Load user's friends
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        
        if (!profileData || !profileData.did) return;
        
        // Get friendships from localStorage
        const friendships = JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}');
        const userFriends = friendships[profileData.did] || [];
        
        console.log("User friends DIDs:", userFriends);
        
        // For each friend DID, get their profile information
        const friendsData = await Promise.all(
          userFriends.map(async (did) => {
            try {
              // First try to get from IPFS
              const ipfsProfile = await getUserProfileFromIPFS(did);
              
              // If we have IPFS data, use that
              if (ipfsProfile && ipfsProfile.username) {
                return {
                  did: did,
                  name: ipfsProfile.username,
                  lastMessage: "Start chatting...",
                  timestamp: "New"
                };
              }
              
              // Otherwise, search for user by DID (this is a fallback)
              const userInfo = await searchUserByDid(did);
              if (userInfo && userInfo.found) {
                return {
                  did: did,
                  name: userInfo.displayName,
                  lastMessage: "Start chatting...",
                  timestamp: "New"
                };
              }
              
              // If all else fails, return minimal info
              return {
                did: did,
                name: `User-${did.substring(9, 13)}`,
                lastMessage: "Start chatting...",
                timestamp: "New"
              };
            } catch (error) {
              console.error(`Error loading friend data for ${did}:`, error);
              return {
                did: did,
                name: `User-${did.substring(9, 13)}`,
                lastMessage: "Start chatting...",
                timestamp: "New"
              };
            }
          })
        );
        
        console.log("Loaded friends data:", friendsData);
        setFriendsList(friendsData);
        
        // Initialize real friends messages
        const savedMessages = localStorage.getItem('liberaChainMessages');
        if (savedMessages) {
          // Merge saved messages with demo messages
          const parsedMessages = JSON.parse(savedMessages);
          // We don't modify the initial messages - just keep them separate
          setMessages(prevMessages => ({...prevMessages, ...parsedMessages}));
        }
        
        // If we have real friends, add a toggle button
        if (friendsData.length > 0) {
          setShowingRealFriends(false); // Start with demo conversations
        }
        
        setInitialized(true);
      } catch (error) {
        console.error("Error loading friends:", error);
        setFriendsList([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    if (profileData) {
      loadFriends();
    }
  }, [profileData]);

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    setIsToggled(!isToggled);
    
    // If this is a friend with a DID (not a demo conversation)
    if (conversation.did) {
      // Initialize messages for this conversation if needed
      if (!messages[conversation.did]) {
        setMessages((prevMessages) => ({
          ...prevMessages,
          [conversation.did]: []
        }));
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversation) {
      // Create new message
      const newMessage = {
        id: Date.now(), // Unique ID based on timestamp
        sender: 'You',
        text: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Update the messages state
      setMessages((prevMessages) => {
        // If this is a friend with a DID, store in localStorage
        if (selectedConversation.did) {
          const updatedMessages = {
            ...prevMessages,
            [selectedConversation.did]: [
              ...(prevMessages[selectedConversation.did] || []),
              newMessage
            ]
          };
          
          // Only store real friends' messages in localStorage
          const realFriendsMessages = {};
          friendsList.forEach(friend => {
            if (updatedMessages[friend.did]) {
              realFriendsMessages[friend.did] = updatedMessages[friend.did];
            }
          });
          localStorage.setItem('liberaChainMessages', JSON.stringify(realFriendsMessages));
          
          return updatedMessages;
        } else {
          // For demo conversations, just update the state
          return {
            ...prevMessages,
            [selectedConversation.id]: [
              ...(prevMessages[selectedConversation.id] || []),
              newMessage
            ]
          };
        }
      });
      
      // Update the conversation's lastMessage
      if (selectedConversation.did) {
        // For real friends
        setFriendsList((prevFriends) => 
          prevFriends.map((friend) => {
            if (friend.did === selectedConversation.did) {
              return {
                ...friend,
                lastMessage: messageInput,
                timestamp: 'Just now'
              };
            }
            return friend;
          })
        );
      } else {
        // For demo conversations
        setConversations((prevConversations) => 
          prevConversations.map((conv) => {
            if (conv.id === selectedConversation.id) {
              return {
                ...conv,
                lastMessage: messageInput,
                timestamp: 'Just now'
              };
            }
            return conv;
          })
        );
      }

      // Reset the input field
      setMessageInput('');
    }
  };
  
  // Toggle between demo conversations and real friends
  const toggleFriendsView = () => {
    setShowingRealFriends(!showingRealFriends);
    setSelectedConversation(null);
  };
  
  // Handle case when a user has no friends yet
  const handleAddFriends = () => {
    router.push('/dashboard');
  };

  if (loadingFriends || !initialized) {
    return (
      <div className="flex h-screen animate-gradient bg-gradient-to-br from-gray-900 to-gray-800 items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-base text-gray-300">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  // Current items to display - either mock conversations or real friends
  const displayItems = showingRealFriends ? friendsList : mockConversations;
  const hasRealFriends = friendsList.length > 0;

  return (
    <div className="flex h-screen animate-gradient bg-gradient-to-br from-gray-900 to-gray-800 relative">
      <Head>
        <title>LiberaChain Messenger</title>
        <meta name="description" content="A decentralized messenger app built with Next.js" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {qrIsVisible ? (
        <div className='w-8/10 h-8/10 md:w-120 md:h-120 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent-400 rounded-2xl absolute
        z-100 flex flex-col justify-start items-center bg-gray-800/80 backdrop-blur gap-20'>
          
          <div className='h-5 md:h-1/10 w-full rounded-2xl bg-transparent flex justify-end p-2 relative'>
            <button onClick={() => {setQrIsVisible(false)}} className='hover:cursor-pointer'>
              <img src={'/x.svg'} className='absolute w-5 md:w-9 top-1 right-1 md:top-2 md:right-2'></img>
            </button>
          </div>
          
          <div className='w-full h-6/10 md:h-8/10 flex items-center justify-center p-2'>
            <img src={'/qr.png'} className='w-full h-full object-contain'></img>
          </div>
        </div>
      ) : (
        <div></div>
      )}

      {/* Sidebar: Conversation List */}
      <div className={`${isToggled ? "w-0" : "w-full"} md:w-1/3 bg-gray-800 border-r border-gray-700 overflow-hidden`}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center gap-5">
          <Link href="/dashboard">
            <img src={'/logo.svg'} width={25} alt="LiberaChain Logo" />
          </Link>
          <h1 className="text-xl font-semibold text-white">Chats</h1>
          <div className='flex justify-center items-center gap-2'>
            <button className='block hover:cursor-pointer'
            onClick={() => {setQrIsVisible(true)}}>
              <img src={'/qr.svg'} alt="QR Code" />
            </button>

            <button className="block md:hidden hover:cursor-pointer" onClick={() => {
              setIsToggled(!isToggled)
            }}>
              <img src={'/menu.svg'} alt="Menu" />
            </button>
          </div>
        </div>

        {/* Toggle between demo and real friends if we have real friends */}
        {hasRealFriends && (
          <div className="p-2 bg-gray-700/50 border-b border-gray-700">
            <div className="flex justify-center">
              <button 
                onClick={toggleFriendsView}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                {showingRealFriends ? "Show Demo Conversations" : "Show My Friends"}
              </button>
            </div>
          </div>
        )}

        {/* Conversation List */}
        {displayItems.length > 0 ? (
          displayItems.map((item) => (
            <div
              key={item.did || item.id}
              onClick={() => handleConversationClick(item)}
              className={`p-4 cursor-pointer hover:bg-gray-700 ${
                selectedConversation?.did === item.did || selectedConversation?.id === item.id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="flex justify-between">
                <h2 className="font-medium text-white">{item.name}</h2>
                <span className="text-sm text-gray-400">{item.timestamp}</span>
              </div>
              <p className="text-sm text-gray-400 truncate">{item.lastMessage}</p>
            </div>
          ))
        ) : showingRealFriends ? (
          <div className="p-8 text-center">
            <div className="bg-gray-700/50 p-4 rounded-md">
              <p className="text-gray-300 mb-4">You haven't added any friends yet</p>
              <button 
                onClick={handleAddFriends}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Add Friends
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-400">No conversations available</p>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className={`${isToggled ? "w-full" : "w-0"} flex-1 flex flex-col md:w-2/3`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between">
              <h2 className="text-lg font-semibold text-white">{selectedConversation.name}</h2>

              <button className="block md:hidden hover:cursor-pointer" onClick={() => {
                setIsToggled(!isToggled)
              }}>
                <img src={'/menu.svg'} alt="Menu" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-800/50">
              {selectedConversation.did ? (
                messages[selectedConversation.did] && messages[selectedConversation.did].length > 0 ? (
                  messages[selectedConversation.did].map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${
                        message.sender === 'You' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          message.sender === 'You'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        <p>{message.text}</p>
                        <span className="text-xs opacity-75">{message.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-400">No messages yet</p>
                      <p className="text-sm text-gray-500 mt-1">Send a message to start chatting</p>
                    </div>
                  </div>
                )
              ) : (
                messages[selectedConversation.id].map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.sender === 'You' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        message.sender === 'You'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      <p>{message.text}</p>
                      <span className="text-xs opacity-75">{message.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-600 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:cursor-pointer"
                > Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800/50">
            <div className="text-center p-6">
              <div className="bg-gray-800/80 rounded-lg p-6 max-w-md border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-2">Welcome to LiberaChain Chat</h3>
                <p className="text-gray-400 mb-4">Select a conversation from the sidebar to start chatting</p>
                {showingRealFriends && friendsList.length === 0 && (
                  <button 
                    onClick={handleAddFriends}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    Add Friends
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

