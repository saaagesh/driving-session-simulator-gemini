// src/components/TestPage.jsx
import { useState } from 'react';

function TestPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-6 mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">React Test Page</h1>
      
      <p className="mb-4 text-gray-700">
        This is a simple test page to verify that React is working properly.
        If you can see this page and interact with the button below, React is functioning correctly.
      </p>
      
      <div className="flex flex-col items-center">
        <p className="text-xl mb-4">Count: {count}</p>
        
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Increment
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Next Steps:</h2>
        <ol className="list-decimal list-inside text-gray-700">
          <li>Verify API endpoints are working</li>
          <li>Check for errors in browser console</li>
          <li>Ensure BigQuery data is accessible</li>
          <li>Test the VehicleReport component</li>
        </ol>
      </div>
    </div>
  );
}

export default TestPage;