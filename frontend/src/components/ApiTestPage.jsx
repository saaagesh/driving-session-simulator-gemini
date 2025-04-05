// src/components/ApiTestPage.jsx
import { useState } from 'react';
import { checkServerHealth, getLatestDashboard, getLatestReport } from '../api/apiService';

function ApiTestPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const testEndpoints = [
    { name: 'Health Check', func: checkServerHealth },
    { name: 'Latest Dashboard', func: getLatestDashboard },
    { name: 'Latest Report', func: getLatestReport }
  ];

  const callEndpoint = async (name, func) => {
    // Mark as loading
    setLoading(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: null }));
    
    try {
      const result = await func();
      console.log(`${name} result:`, result);
      setResults(prev => ({ ...prev, [name]: result }));
    } catch (error) {
      console.error(`${name} error:`, error);
      setErrors(prev => ({ ...prev, [name]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API Test Page</h1>
      
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          This page allows you to test individual API endpoints to debug connection issues.
          Click the buttons below to test each endpoint directly.
        </p>
      </div>
      
      <div className="grid gap-6">
        {testEndpoints.map(endpoint => (
          <div key={endpoint.name} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{endpoint.name}</h2>
              <button
                onClick={() => callEndpoint(endpoint.name, endpoint.func)}
                disabled={loading[endpoint.name]}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading[endpoint.name] ? 'Testing...' : 'Test Endpoint'}
              </button>
            </div>
            
            {loading[endpoint.name] && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                <span>Testing endpoint...</span>
              </div>
            )}
            
            {errors[endpoint.name] && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 mb-3">
                <p className="font-semibold">Error:</p>
                <p className="font-mono text-sm">{errors[endpoint.name]}</p>
              </div>
            )}
            
            {results[endpoint.name] && !errors[endpoint.name] && (
              <div className="mt-2">
                <p className="text-green-600 font-semibold mb-1">Success!</p>
                <div className="bg-gray-50 p-2 rounded-lg max-h-60 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(results[endpoint.name], null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApiTestPage;