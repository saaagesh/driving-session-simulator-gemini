import React, { useState } from 'react';

const PerformanceSummary = ({ summary, stats }) => {
  const [showFullSummary, setShowFullSummary] = useState(false);
  
  // Ensure we have stats to work with
  if (!stats) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-yellow-700">No performance data available</p>
      </div>
    );
  }
  
  // Create a short summary from the full AI-generated summary
  const shortSummary = summary && summary.length > 150 
    ? `${summary.substring(0, 150)}...` 
    : summary;
    
  // Calculate key performance metrics
  const maxSpeed = stats['Wheel Speed Stats']?.max 
    ? Math.round(stats['Wheel Speed Stats'].max * 0.621) // Convert to mph
    : 0;
    
  const avgSpeed = stats['Wheel Speed Stats']?.mean
    ? Math.round(stats['Wheel Speed Stats'].mean * 0.621) // Convert to mph
    : 0;
    
  const drivingTime = stats['Total Time (secs)']
    ? Math.round(stats['Total Time (secs)'])
    : 0;
    
  const fuelUsage = stats['Fuel Start'] && stats['Fuel End']
    ? Math.round((stats['Fuel Start'] - stats['Fuel End']) * 100)
    : 0;
    
  const brakeCount = stats['Brake Usage Count'] || 0;
  
  const maxRPM = stats['RPM Stats']?.max
    ? Math.round(stats['RPM Stats'].max)
    : 0;
  
  // Get gear changes if available
  const gearChanges = stats['Gear Change Details']?.length || 0;
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with key stats */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <h2 className="text-xl font-bold mb-2">Performance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-2xl font-bold">{maxSpeed}</p>
            <p className="text-xs uppercase">Top Speed (mph)</p>
          </div>
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-2xl font-bold">{drivingTime}s</p>
            <p className="text-xs uppercase">Drive Time</p>
          </div>
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-2xl font-bold">{fuelUsage}%</p>
            <p className="text-xs uppercase">Fuel Used</p>
          </div>
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-2xl font-bold">{brakeCount}</p>
            <p className="text-xs uppercase">Brake Uses</p>
          </div>
        </div>
      </div>
      
      {/* Body with expandable insights */}
      <div className="p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">AI Analysis</h3>
            <button 
              onClick={() => setShowFullSummary(!showFullSummary)}
              className="text-blue-600 text-sm hover:underline focus:outline-none"
            >
              {showFullSummary ? 'Show Less' : 'Show More'}
            </button>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p className="whitespace-pre-line">
              {showFullSummary ? summary : shortSummary}
            </p>
          </div>
        </div>
        
        {/* Additional metrics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Average Speed</p>
            <p className="font-medium">{avgSpeed} mph</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Max RPM</p>
            <p className="font-medium">{maxRPM}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Gear Changes</p>
            <p className="font-medium">{gearChanges}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummary;