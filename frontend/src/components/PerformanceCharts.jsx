import { useState } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

function PerformanceCharts({ graphs }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Chart color schemes
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  const renderChart = (graph, index) => {
    if (!graph || !graph.data) return null;
    
    switch (graph.graph_type) {
      case 'pie': {
        // Convert damage data to array format for pie chart
        const data = typeof graph.data === 'object' && !Array.isArray(graph.data)
          ? Object.entries(graph.data).map(([name, value]) => ({ name, value }))
          : graph.data;
        
        return (
          <div key={index} className={`${activeTab === index ? 'block' : 'hidden'} h-80`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {data.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      }
      case 'bar': {
        return (
          <div key={index} className={`${activeTab === index ? 'block' : 'hidden'} h-80`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graph.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={graph.x_axis} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={graph.y_axis} fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }
      case 'line': {
        return (
          <div key={index} className={`${activeTab === index ? 'block' : 'hidden'} h-80`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graph.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={graph.x_axis} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={graph.y_axis} 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      }
      case 'area': {
        return (
          <div key={index} className={`${activeTab === index ? 'block' : 'hidden'} h-80`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graph.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={graph.x_axis} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey={graph.y_axis} 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      }
      default:
        return null;
    }
  };
  
  if (!graphs || graphs.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
      
      <div className="mb-4 border-b">
        <div className="flex flex-wrap">
          {graphs.map((graph, index) => (
            <button
              key={index}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === index
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(index)}
            >
              {graph.title}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg">
        {graphs.map((graph, index) => renderChart(graph, index))}
      </div>
    </div>
  );
}

PerformanceCharts.propTypes = {
  graphs: PropTypes.arrayOf(
    PropTypes.shape({
      graph_type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      x_axis: PropTypes.string,
      y_axis: PropTypes.string,
      data: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object
      ]).isRequired
    })
  ).isRequired
};

export default PerformanceCharts;