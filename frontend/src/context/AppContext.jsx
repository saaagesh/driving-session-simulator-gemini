// src/context/AppContext.jsx
import { createContext } from 'react';

// Create the context with default values
export const AppContext = createContext({
  // Default state values
  playerId: '',
  setPlayerId: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sessionId: '',
  setSessionId: () => {},
  hasPreviousSessions: false,
  setHasPreviousSessions: () => {},
  chatHistory: [],
  setChatHistory: () => {},
  isChatOpen: false,
  setIsChatOpen: () => {},
  darkMode: false,
  
  // Default action values
  addChatMessage: () => {},
  clearChatHistory: () => {},
  toggleDarkMode: () => {},
  handleLogout: () => {}
});

