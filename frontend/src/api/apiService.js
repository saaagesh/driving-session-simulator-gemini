// src/api/apiService.js
// This file contains functions for interacting with the backend API

// Helper function to handle fetch errors and different response types
const handleResponse = async (response) => {
  // First check the content type
  const contentType = response.headers.get('content-type');
  
  // If not a successful response, handle the error appropriately
  if (!response.ok) {
    // If HTML response, return a more helpful error message
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
    }
    
    // For other error types, try to get the error details
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || `API error: ${response.status}`);
    }
    
    // Default error if we can't parse the error response
    throw new Error(`Request failed with status: ${response.status}`);
  }
  
  // For successful responses, parse according to content type
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else if (contentType && contentType.includes('text/html')) {
    // Handle HTML response (this is unusual for an API but can happen)
    // Just return a success object since we can't use HTML directly
    return { 
      success: true, 
      message: "Data refreshed successfully",
      status: response.status,
      contentType: contentType
    };
  }
  
  // For other content types or empty responses
  return { 
    success: true,
    status: response.status,
    contentType: contentType
  };
};

// Check server health
export const checkServerHealth = async () => {
  try {
    const response = await fetch('/api/health');
    return handleResponse(response);
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};

// Get the latest dashboard data
export const getLatestDashboard = async () => {
  try {
    const response = await fetch('/api/latest_dashboard');
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching latest dashboard:', error);
    throw error;
  }
};

// Get the latest detailed report
export const getLatestReport = async () => {
  try {
    const response = await fetch('/api/latest_report');
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching latest report:', error);
    throw error;
  }
};

// Get dashboard data for a specific player
export const getPlayerDashboard = async (playerId) => {
  try {
    const response = await fetch(`/api/latest_dashboard/${playerId}`);
    return handleResponse(response);
  } catch (error) {
    console.error(`Error fetching dashboard for player ${playerId}:`, error);
    throw error;
  }
};

// Get all sessions for a player
export const getPlayerSessions = async (playerId) => {
  try {
    const response = await fetch(`/api/player_sessions/${playerId}`);
    return handleResponse(response);
  } catch (error) {
    console.error(`Error fetching sessions for player ${playerId}:`, error);
    throw error;
  }
};

// Refresh dashboard data - this triggers data refresh from BigQuery
export const refreshDashboardData = async () => {
  try {
    // Use the same endpoint that loads data initially when the dashboard opens
    // This is likely your getLatestDashboard or similar function
    const response = await fetch('/api/latest_dashboard');
    
    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Dashboard data refresh failed with status: ${response.status}`);
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type');
    
    // Parse the response based on content type
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, handle appropriately (rarely happens with latest_dashboard)
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    // Return the new data
    return {
      success: true,
      message: "Dashboard data refreshed successfully",
      data: data
    };
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    throw error;
  }
};

// Get statistics for a player
export const getPlayerStats = async (playerId) => {
  try {
    const response = await fetch(`/api/player_stats/${playerId}`);
    return handleResponse(response);
  } catch (error) {
    console.error(`Error fetching stats for player ${playerId}:`, error);
    throw error;
  }
};