import { useState } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

function PerformanceCharts({ graphs }) {
  // Chart color schemes
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Function to sort gear distribution data numerically
  const sortGearData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    // Ensure we're sorting by numeric gear values
    return [...data].sort((a, b) => {
      const gearA = typeof a.Gear === 'string' ? parseInt(a.Gear, 10) : a.Gear;
      const gearB = typeof b.Gear === 'string' ? parseInt(b.Gear, 10) : b.Gear;
      return gearA - gearB;
    });
  };

  // Function to render a specific chart based on type
  const renderChart = (graph, index) => {
    if (!graph || !graph.data) return null;
    
    switch (graph.graph_type) {
      case 'pie': {
        // Convert damage data to array format for pie chart
        const data = typeof graph.data === 'object' && !Array.isArray(graph.data)
          ? Object.entries(graph.data).map(([name, value]) => ({ name, value }))
          : graph.data;
        
        return (
          <div key={index} className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">{graph.title}</h3>
            <div className="h-80 border rounded-lg bg-gray-50 p-4">
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
          </div>
        );
      }
      case 'bar': {
        // For gear distribution, sort data by gear number
        const sortedData = graph.title.includes('Gear Distribution') 
          ? sortGearData(graph.data)
          : graph.data;
        
        return (
          <div key={index} className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">{graph.title}</h3>
            <div className="h-80 border rounded-lg bg-gray-50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={graph.x_axis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={graph.y_axis} fill="#8884d8">
                    {sortedData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
      case 'line': {
        // Set domain for fuel chart to show range from 0.9 to 1.0
        const isFuelChart = graph.title.includes('Fuel');
        
        return (
          <div key={index} className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">{graph.title}</h3>
            <div className="h-80 border rounded-lg bg-gray-50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graph.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={graph.x_axis} 
                    label={{ value: graph.x_axis, position: 'insideBottom', offset: -5 }} 
                  />
                  <YAxis
                    domain={isFuelChart ? [0.9, 1.0] : ['auto', 'auto']}
                    label={{ value: graph.y_axis, angle: -90, position: 'insideLeft' }}
                    tickFormatter={isFuelChart ? (val) => val.toFixed(3) : (val) => val}
                  />
                  <Tooltip 
                    formatter={(value) => isFuelChart ? value.toFixed(3) : value.toFixed(2)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={graph.y_axis} 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
      case 'area': {
        return (
          <div key={index} className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">{graph.title}</h3>
            <div className="h-80 border rounded-lg bg-gray-50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graph.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={graph.x_axis} 
                    label={{ value: graph.x_axis, position: 'insideBottom', offset: -5 }} 
                  />
                  <YAxis
                    label={{ value: graph.y_axis, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey={graph.y_axis} 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
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
      <div className="bg-white p-4 rounded-lg">
        {/* Display all charts at once */}
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