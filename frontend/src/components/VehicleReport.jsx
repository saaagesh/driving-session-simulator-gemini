// src/components/VehicleReport.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getLatestReport, getLatestDashboard } from '../api/apiService';
import Dashboard from './PlayerDashboard';

function VehicleReport() {
  const { setIsLoading, setError } = useContext(AppContext);
  const [reportData, setReportData] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [localError, setLocalError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setLocalError(null);
        
        // Fetch both report data and player statistics in parallel
        const [reportData, statsData] = await Promise.all([
          getLatestReport(),
          getLatestDashboard()
        ]);
        
        setReportData(reportData);
        setPlayerStats(statsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching vehicle report data:', err);
        setLocalError(err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [setIsLoading, setError]);
  
  if (localError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-2">Error Loading Report</h2>
        <p>{localError}</p>
        <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium text-gray-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside text-gray-700 space-y-1">
            <li>Make sure the backend server is running at <code className="text-red-600 bg-red-50 px-1 rounded">http://localhost:8000</code></li>
            <li>Try running a new simulation with the original UI</li>
            <li>Check the network tab in developer tools for more details</li>
          </ol>
        </div>
      </div>
    );
  }
  
  // Show loading indicator via AppContext (LoadingIndicator component)
  
  return (
    <div className="pb-12">
      <Dashboard reportData={reportData} playerStats={playerStats} />
      
      {reportData && (
        <div className="mt-8 container mx-auto px-4">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 flex justify-between">
            <div>
              <p>Player ID: {reportData.player_id}</p>
              <p>Session ID: {reportData.session_id}</p>
            </div>
            <div className="text-right">
              <p>Report generated at: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleReport;