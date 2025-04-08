// src/App.jsx - Updated with ModernHeader integration
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext'; // Import the pro
import ModernHeader from './components/ModernHeader';
import LoginForm from './components/LoginForm';
import VehicleReport from './components/VehicleReport';
import PlayerDashboard from './components/PlayerDashboard';
import ChatInterface from './components/ChatInterface';
import LoadingIndicator from './components/LoadingIndicator';
import TestPage from './components/TestPage';
import './App.css';

// Create a wrapper component to pass the current path to ModernHeader
function HeaderWithLocation() {
  const location = useLocation();
  return <ModernHeader currentPath={location.pathname} />;
}

function App() {
  const [playerId, setPlayerId] = useState(() => {
    return sessionStorage.getItem('playerId') || '';
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
    if (playerId) {
      sessionStorage.setItem('playerId', playerId);
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
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <HeaderWithLocation />
          
          <div className="container mx-auto py-6 px-4">
            <Routes>
              <Route 
                path="/" 
                element={<PlayerDashboard />} 
              />
              <Route 
                path="/dashboard" 
                element={<Navigate to="/" replace />}
              />
              <Route 
                path="/summary" 
                element={<VehicleReport />} 
              />
              <Route 
                path="/test" 
                element={<TestPage />} 
              />
            </Routes>
          </div>
          
          <ChatInterface />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;