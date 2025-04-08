// src/context/AppContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import LoadingIndicator from '../components/LoadingIndicator';

// Create the context
export const AppContext = createContext();

// Context provider component
export const AppProvider = ({ children }) => {
  const [playerId, setPlayerId] = useState(() => {
    // Log during initialization
    const storedId = sessionStorage.getItem('playerId') || '';
    console.log('Initial playerId from sessionStorage:', storedId);
    return storedId;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [hasPreviousSessions, setHasPreviousSessions] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Save playerId to sessionStorage when it changes
  useEffect(() => {
    console.log('Player ID changed to:', playerId);
    if (playerId) {
      sessionStorage.setItem('playerId', playerId);
    }
  }, [playerId]);

  // Get most recent player ID if none is set
  useEffect(() => {
    if (!playerId) {
      const fetchMostRecentPlayer = async () => {
        try {
          // First, try to get all available players
          const response = await fetch('/api/players');
          const data = await response.json();
          
          if (data.players && data.players.length > 0) {
            // Get the most recent player (should be the first one since they're ordered by timestamp)
            const mostRecentPlayer = data.players[0].player_id;
            console.log('Setting most recent player from players list:', mostRecentPlayer);
            setPlayerId(mostRecentPlayer);
          } else {
            // Fallback to health check if players endpoint doesn't work
            const healthResponse = await fetch('/api/health');
            const healthData = await healthResponse.json();
            if (healthData.latest_player && 
                healthData.latest_player !== "No players found" && 
                healthData.latest_player !== "Error retrieving player") {
              console.log('Setting default playerId from health check:', healthData.latest_player);
              setPlayerId(healthData.latest_player);
            }
          }
        } catch (err) {
          console.error('Error fetching player list:', err);
        }
      };
      
      fetchMostRecentPlayer();
    }
  }, [playerId]);

  const handleLogout = () => {
    sessionStorage.removeItem('playerId');
    setPlayerId('');
    setSessionId('');
    setChatHistory([]);
    setIsChatOpen(false);
  };

  // Add a message to chat history
  const addChatMessage = (message, isUser = true) => {
    console.log(`Adding chat message: ${message.substring(0, 30)}... for ${isUser ? 'user' : 'AI'}`);
    setChatHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        message,
        isUser,
        timestamp: new Date().toISOString(),
      },
    ]);
  };
  
  // Clear chat history
  const clearChatHistory = () => {
    setChatHistory([]);
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Context value
  const contextValue = {
    // State
    playerId,
    setPlayerId,
    isLoading,
    setIsLoading,
    error,
    setError,
    sessionId,
    setSessionId,
    hasPreviousSessions,
    setHasPreviousSessions,
    chatHistory,
    setChatHistory,
    isChatOpen,
    setIsChatOpen,
    darkMode,
    
    // Actions
    addChatMessage,
    clearChatHistory,
    toggleDarkMode,
    handleLogout
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {isLoading && <LoadingIndicator message="Fetching data from BigQuery..." />}
    </AppContext.Provider>
  );
};