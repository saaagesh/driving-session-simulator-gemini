// debug-react-app.js
// Run this in the browser console to debug common React app issues

console.log('===== REACT APP DEBUGGING =====');

// Check if we're on a React route
console.log('Current URL:', window.location.href);
console.log('Pathname:', window.location.pathname);

// Check if manifest.json is accessible
fetch('/manifest.json')
  .then(response => {
    if (!response.ok) {
      console.error('❌ manifest.json not accessible:', response.status, response.statusText);
      return null;
    }
    return response.json();
  })
  .then(data => {
    if (data) {
      console.log('✅ manifest.json is accessible:', data);
    }
  })
  .catch(error => {
    console.error('❌ Error fetching manifest.json:', error);
  });

// Check if main React app resources are accessible
fetch('/static/js/main.chunk.js')
  .then(response => {
    console.log('Main chunk JS:', response.status, response.statusText);
  })
  .catch(error => {
    console.error('❌ Error fetching main chunk:', error);
  });

// Check if the React app root element exists
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('✅ Root element found');
  console.log('Root element children:', rootElement.children.length);
  console.log('Root element HTML:', rootElement.innerHTML.substring(0, 100) + '...');
} else {
  console.error('❌ Root element not found');
}

// Log any React-related global variables
console.log('window.React exists:', !!window.React);
console.log('window.ReactDOM exists:', !!window.ReactDOM);

// Check FastAPI serving configuration
console.log('===== API ENDPOINT TESTS =====');
fetch('/api/latest_report')
  .then(response => {
    console.log('Latest report endpoint:', response.status, response.statusText);
    if (response.ok) {
      return response.json();
    }
    return null;
  })
  .then(data => {
    if (data) {
      console.log('Latest report data available', Object.keys(data));
    }
  })
  .catch(error => {
    console.error('Error with latest report endpoint:', error);
  });