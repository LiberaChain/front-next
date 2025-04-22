'use client'

import { useState } from 'react';
import Head from 'next/head';
import './chat.css'

// Mocked data for conversations and messages
const mockConversations = [
  { id: 1, name: 'Alice', lastMessage: 'Hey, how’s it going?', timestamp: '10:30 AM' },
  { id: 2, name: 'Bob', lastMessage: 'Well hey, at least we’re both contributing in our own special ways.', timestamp: '9:15 AM' },
  { id: 3, name: 'Charlie', lastMessage: 'Check this out!', timestamp: 'Yesterday' },
];

export default function Home() {
  const [isToggled, setIsToggled] = useState(false)
  const [qrIsVisible, setQrIsVisible] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState({
    1: [
      { id: 1, sender: 'Alice', text: 'Hey, how’s it going?', timestamp: '10:30 AM' },
      { id: 2, sender: 'You', text: 'Pretty good, you?', timestamp: '10:32 AM' },
    ],
    2: [
      { id: 1, sender: 'Bob', text: 'Hey, saw your slides... bold choice of font.', timestamp: '9:15 AM' },
      { id: 2, sender: 'You', text: 'Thanks! I figured readability was less important than making a statement.', timestamp: '9:17 AM' },
      { id: 3, sender: 'Bob', text: 'Totally. And you really made a *statement* not showing up to the 8am stand-up.', timestamp: '9:18 AM' },
      { id: 4, sender: 'You', text: 'Oh, was that today? I guess I was busy fixing the bug you "closed" yesterday.', timestamp: '9:20 AM' },
      { id: 5, sender: 'Bob', text: 'Well hey, at least we’re both contributing in our own special ways.', timestamp: '9:22 AM' },
      { id: 6, sender: 'You', text: 'Absolutely. Some of us just do it during work hours.', timestamp: '9:24 AM' },
    ],
    3: [
      { id: 1, sender: 'Charlie', text: 'Check this out!', timestamp: 'Yesterday' },
      { id: 2, sender: 'You', text: 'Looks cool!', timestamp: 'Yesterday' },
    ],
  });

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    setIsToggled(!isToggled)
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversation) {
      // Add the new message to the selected conversation's messages
      const newMessage = {
        id: Date.now(), // Unique ID based on timestamp
        sender: 'You',
        text: messageInput,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Update the messages state with the new message
      setMessages((prevMessages) => ({
        ...prevMessages,
        [selectedConversation.id]: [...prevMessages[selectedConversation.id], newMessage],
      }));

      // Reset the input field
      setMessageInput('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      <Head>
        <title>Messenger App</title>
        <meta name="description" content="A simple messenger app built with Next.js and Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {qrIsVisible ? (
        <div className='w-8/10 h-8/10 md:w-120 md:h-120 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent-400 rounded-2xl absolute
        z-100 flex flex-col justify-start items-center bg-white/10 backdrop-blur gap-20'>
          
          <div className='h-5 md:h-1/10 w-full rounded-2xl bg-transparent flex justify-end p-2 relative'>
            <button onClick={() => {setQrIsVisible(false)}} className='hover:cursor-pointer'>
              <img src={'./x.svg'} className='absolute w-5 md:w-9 top-1 right-1 md:top-2 md:right-2'></img>
            </button>
          </div>
          

          <div className='w-full h-6/10 md:h-8/10 flex items-center justify-center p-2'>
            <img src={'./qr.png'} className='w-full h-full object-contain'></img>
          </div>
        </div>
      ) : (
        <div></div>
      ) }

      {/* Sidebar: Conversation List */}
      <div className={`${isToggled ? "w-0" : "w-full"} md:w-1/3 bg-white border-r border-gray-200 overflow-hidden animate-gradient`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center gap-5 text-white">
          <img src={'/logo.svg'} width={25} />
          <h1 className="text-xl font-semibold">Chats</h1>
            <div className='flex justify-center items-center gap-2'>

                <button className='block hover:cursor-pointer'
                onClick={() => {setQrIsVisible(true)}}>
                  <img src={'./qr.svg'}></img>
                </button>

                <button className="block md:hidden hover:cursor-pointer" onClick={() => {
                  setIsToggled(!isToggled)
                }}>
                  <img src={'./menu.svg'}></img>
                </button>
            </div>
        </div>
        {mockConversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => handleConversationClick(conversation)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${
              selectedConversation?.id === conversation.id ? 'bg-gray-100' : ''
            }`}
          >
            <div className="flex justify-between">
              <h2 className="font-medium">{conversation.name}</h2>
              <span className="text-sm text-gray-500">{conversation.timestamp}</span>
            </div>
            <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className={`${isToggled ? "w-full" : "w-0"} flex-1 flex flex-col md:w-2/3`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between">
              <h2 className="text-lg font-semibold">{selectedConversation.name}</h2>

              <button className="block md:hidden hover:cursor-pointer" onClick={() => {
                setIsToggled(!isToggled)
              }}>
                <img src={'./menu.svg'}></img>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages[selectedConversation.id].map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 flex ${
                    message.sender === 'You' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      message.sender === 'You'
                        ? 'bg-[#2FD7A2] text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p>{message.text}</p>
                    <span className="text-xs opacity-75">{message.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2FD7A2] text-white rounded-lg hover:bg-[#23B8BD] hover:cursor-pointer"
                > Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-0 md:opacity-1">
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

