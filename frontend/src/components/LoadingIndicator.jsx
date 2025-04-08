// src/components/LoadingIndicator.jsx
function LoadingIndicator({ message = "Loading data..." }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700">{message}</p>
        {/* Remove the redundant line below */}
        {/* <p className="text-sm text-gray-500 mt-2">Fetching from BigQuery</p> */}
      </div>
    </div>
  );
}

export default LoadingIndicator;