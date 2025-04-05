import React, { useState, useContext } from 'react';

function LoginForm() {
  const [playerId, setPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implementation would go here
    console.log('Login submitted with player ID:', playerId);
  };
  
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Enter Player ID</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter Player ID"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Starting Simulation...' : 'Start Simulation'}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;