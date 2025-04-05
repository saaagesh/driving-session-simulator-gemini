import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';

const ChatInterface = () => {
  const { 
    playerId, 
    chatHistory, 
    addChatMessage, 
    isChatOpen, 
    setIsChatOpen,
    isLoading
  } = useContext(AppContext);
  
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageEndRef = useRef();
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !playerId || isSubmitting) return;
    
    const userMessage = message.trim();
    setMessage('');
    addChatMessage(userMessage, true);
    setIsSubmitting(true);
    
    // Simulate API response delay
    setTimeout(() => {
      const assistantResponse = "I've analyzed your vehicle data. Your driving shows good handling but there are opportunities to improve fuel efficiency. Try to maintain a more consistent speed and avoid rapid acceleration.";
      addChatMessage(assistantResponse, false);
      setIsSubmitting(false);
    }, 1500);
  };
  
  // Suggestions for chat
  const suggestions = [
    "What does the P0147 code mean?",
    "Why is my fuel consumption so high?",
    "Analyze my braking patterns",
    "How can I improve my driving efficiency?"
  ];
  
  // If chat is not open, show just the chat button
  if (!isChatOpen) {
    return (
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl z-20 flex items-center justify-center transition-all duration-200 transform hover:scale-105"
        aria-label="Open chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl z-20 flex flex-col max-h-[500px] overflow-hidden">
      {/* Chat header */}
      <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-medium">Drive Assistant</h3>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="text-white hover:text-blue-100 focus:outline-none"
          aria-label="Close chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-gray-500 text-center space-y-4">
            <p className="mb-4">Ask me anything about your vehicle performance or diagnostics.</p>
            
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-left text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  onClick={() => {
                    setMessage(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`flex ${chat.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!chat.isUser && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    chat.isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm">{chat.message}</p>
                  <div className={`text-xs mt-1 ${chat.isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {chat.isUser && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>
      
      {/* Chat input */}
      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your driving..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            disabled={isSubmitting || isLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full disabled:opacity-50 w-10 h-10 flex items-center justify-center"
            disabled={isSubmitting || !message.trim() || isLoading}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;