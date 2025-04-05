// src/components/DiagnosticReport.jsx
import PropTypes from 'prop-types';

function DiagnosticReport({ dtcCodes, dtcResponse }) {
  // Parse DTC codes if they're in a string format
  const parsedCodes = Array.isArray(dtcCodes) 
    ? dtcCodes 
    : (typeof dtcCodes === 'string' && dtcCodes.startsWith('[')) 
      ? JSON.parse(dtcCodes) 
      : [dtcCodes];
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Diagnostic Report</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">DTC Codes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {parsedCodes.map((code, index) => (
            <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium inline-block">
              {code}
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Analysis & Recommendations</h3>
        <div className="prose max-w-none">
          <div className="whitespace-pre-line text-sm">
            {dtcResponse}
          </div>
        </div>
      </div>
    </div>
  );
}

DiagnosticReport.propTypes = {
  dtcCodes: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array
  ]).isRequired,
  dtcResponse: PropTypes.string.isRequired
};

export default DiagnosticReport;