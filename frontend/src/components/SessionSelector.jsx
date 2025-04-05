// src/components/SessionSelector.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getPlayerSessions } from '../api/apiService';

function SessionSelector({ playerId, currentSessionId, onSessionChange }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    async function loadSessions() {
      if (!playerId) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const sessionsData = await getPlayerSessions(playerId);
        setSessions(sessionsData.sessions || []);
      } catch (err) {
        console.error('Error loading sessions:', err);
        setError('Failed to load previous sessions');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSessions();
  }, [playerId]);
  
  if (isLoading) {
    return <div className="text-gray-600 text-sm">Loading sessions...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }
  
  if (sessions.length === 0) {
    return null;
  }
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <div className="mb-6">
      <label htmlFor="session-select" className="block text-sm font-medium text-gray-700 mb-2">
        Previous Sessions
      </label>
      <select
        id="session-select"
        className="block w-full bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        value={currentSessionId || ''}
        onChange={(e) => onSessionChange(e.target.value)}
      >
        <option value="">Current Session</option>
        {sessions.map((session) => (
          <option key={session.session_id} value={session.session_id}>
            {formatDate(session.timestamp)}
          </option>
        ))}
      </select>
    </div>
  );
}

SessionSelector.propTypes = {
  playerId: PropTypes.string.isRequired,
  currentSessionId: PropTypes.string,
  onSessionChange: PropTypes.func.isRequired
};

export default SessionSelector;