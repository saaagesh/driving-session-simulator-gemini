// test-latest-report.js
// Run this in the browser console when on your React app page to test the endpoint

async function testLatestReportEndpoint() {
    console.log('Testing /api/latest_report endpoint...');
    
    try {
      const response = await fetch('/api/latest_report');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Success! Latest report data:', data);
      
      // Check if data has expected fields
      const hasRequiredFields = 
        data.generated_text !== undefined &&
        data.player_id !== undefined &&
        data.graphs !== undefined &&
        data.summary_stats !== undefined;
        
      if (hasRequiredFields) {
        console.log('✅ Data contains all required fields');
      } else {
        console.log('❌ Data is missing required fields');
        console.log('Missing fields:', {
          'generated_text': data.generated_text === undefined,
          'player_id': data.player_id === undefined,
          'graphs': data.graphs === undefined,
          'summary_stats': data.summary_stats === undefined
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error testing endpoint:', error);
      return null;
    }
  }
  
  testLatestReportEndpoint();