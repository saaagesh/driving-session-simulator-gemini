// src/components/PlayerDashboard.jsx - Updated version
import React, { useState, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppContext } from '../context/AppContext';
import { getPlayerStats } from '../api/apiService';
import { refreshDashboardData } from '../api/apiService';
import { getVisualizationData } from '../api/apiService';
import ChatInterface from './ChatInterface';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import VehicleDamageVisualization from './VehicleDamageVisualization';

function PlayerDashboard() {
  const { setIsLoading, setError, playerId, setPlayerId, } = useContext(AppContext);
  const [stats, setStats] = useState(null);
  const [activeSection, setActiveSection] = useState('vehicle');
  const [playerList, setPlayerList] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [keyInsights, setKeyInsights] = useState([]);
  const [goodPoints, setGoodPoints] = useState([]);
  const [badPoints, setBadPoints] = useState([]);
  const [verdictText, setVerdictText] = useState('');
  const [vehicleCarePercentage, setVehicleCarePercentage] = useState(100);
  const [driverScore, setDriverScore] = useState(70);
  const [showScoreExplanation, setShowScoreExplanation] = useState(false);
  const [rawPerformanceSummary, setRawPerformanceSummary] = useState('');
  const [coachComments, setCoachComments] = useState('');
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [visualizationData, setVisualizationData] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [activeChart, setActiveChart] = useState(0);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [scoreComponents, setScoreComponents] = useState({
    speed: 70,
    control: 80,
    efficiency: 90,
    technique: 75,
    vehicleCare: 60
  });
  
  // Chart color scheme
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  useEffect(() => {
    // Fetch list of all players
    async function fetchPlayerList() {
      try {
        const response = await fetch('/api/players');
        if (response.ok) {
          const data = await response.json();
          setPlayerList(data.players || []);
          
          // If we have players and no selected player yet, select the first one
          if (data.players && data.players.length > 0 && !selectedPlayer) {
            setSelectedPlayer(data.players[0].player_id);
          }
        }
      } catch (error) {
        console.error('Error fetching player list:', error);
      }
    }
    
    fetchPlayerList();
  }, [selectedPlayer]);
  
  useEffect(() => {
    async function loadPlayerStats() {
      if (!selectedPlayer) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch data for the selected player
        const endpoint = selectedPlayer 
          ? `/api/latest_dashboard/${selectedPlayer}`
          : '/api/latest_dashboard';
          
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`Non-JSON response: ${contentType}`);
          const text = await response.text();
          console.error(`Response content (first 100 chars): ${text.substring(0, 100)}`);
          throw new Error(`Expected JSON but got ${contentType || 'unknown'} response`);
        }
        
        const data = await response.json();
        console.log("Raw dashboard data:", data); // Debug log
        
        // Parse gears data properly
        console.log("=================== GEARS DATA DEBUGGING ===================");
        console.log("Raw API response data:", data);

        let gearsUsed = [];
        // Check which gear-related fields are present
        console.log("Checking gear data fields in API response:");
        console.log("- gears_used present:", data.hasOwnProperty('gears_used'));
        console.log("- gears_used value:", data.gears_used);
        console.log("- gears_used type:", typeof data.gears_used);

        console.log("- unique_gears_count present:", data.hasOwnProperty('unique_gears_count'));
        console.log("- unique_gears_count value:", data.unique_gears_count);
        console.log("- unique_gears_count type:", typeof data.unique_gears_count);

        console.log("- avg_gears_used present:", data.hasOwnProperty('avg_gears_used'));
        console.log("- avg_gears_used value:", data.avg_gears_used);
        console.log("- avg_gears_used type:", typeof data.avg_gears_used);

        // Based on the console log data, we know that avg_gears_used is 1
        // Use the most reliable source of gear data
        if (data.avg_gears_used !== undefined && typeof data.avg_gears_used === 'number') {
          const gearCount = Math.round(data.avg_gears_used);
          console.log(`Using avg_gears_used as source: ${gearCount}`);
          // Create a synthetic array of the right length
          gearsUsed = Array.from({ length: gearCount }, (_, i) => i);
        } else if (data.gears_used) {
          console.log("Attempting to parse gears_used");
          if (typeof data.gears_used === 'string') {
            try {
              gearsUsed = JSON.parse(data.gears_used);
              console.log(`Parsed gears_used string: ${JSON.stringify(gearsUsed)}`);
            } catch (e) {
              console.error(`Error parsing gears_used as JSON: ${e.message}`);
              // Try other parsing methods if JSON fails
              if (data.gears_used.includes(',')) {
                gearsUsed = data.gears_used.split(',').map(g => parseInt(g.trim()));
                console.log(`Parsed as comma-separated list: ${JSON.stringify(gearsUsed)}`);
              } else {
                // Try to convert to a number
                const singleGear = parseInt(data.gears_used);
                if (!isNaN(singleGear)) {
                  gearsUsed = [singleGear];
                  console.log(`Parsed as single number: ${singleGear}`);
                }
              }
            }
          } else if (Array.isArray(data.gears_used)) {
            // If it's already an array, use it directly
            gearsUsed = data.gears_used;
            console.log(`Using existing array: ${JSON.stringify(gearsUsed)}`);
          }
        } else if (data.unique_gears_count !== undefined) {
          // If we only have the count but not the actual gears array
          const count = parseInt(data.unique_gears_count || 0, 10);
          console.log(`Creating synthetic gears array from unique_gears_count: ${count}`);
          gearsUsed = Array.from({ length: count }, (_, i) => i);
        } else {
          console.log("No gear data found, using default value of 1");
          // Default to 1 gear if no data is available
          gearsUsed = [0]; // Zero-indexed, so gear 1 is represented as 0
        }

        // Check if the parsed result is actually an array
        if (!Array.isArray(gearsUsed)) {
          console.error("Parsing result is not an array, converting to array");
          if (typeof gearsUsed === 'number') {
            gearsUsed = [gearsUsed];
          } else if (typeof gearsUsed === 'object') {
            gearsUsed = Object.values(gearsUsed);
          } else {
            gearsUsed = [0]; // Default to gear 0 (first gear)
          }
          console.log(`Converted non-array result to: ${JSON.stringify(gearsUsed)}`);
        }

        // Filter out any non-numeric values or NaN values
        const filteredGearsUsed = gearsUsed.filter(gear => 
          typeof gear === 'number' && !isNaN(gear)
        );

        if (filteredGearsUsed.length !== gearsUsed.length) {
          console.warn(`Filtered out non-numeric values. Before: ${JSON.stringify(gearsUsed)}, After: ${JSON.stringify(filteredGearsUsed)}`);
          gearsUsed = filteredGearsUsed;
        }

        // If array is empty after filtering, default to one gear
        if (gearsUsed.length === 0) {
          console.warn("Gears array is empty after filtering, defaulting to 1 gear");
          gearsUsed = [0];
        }

        // Gear count should be the length of the array
        const gearCount = gearsUsed.length;
        console.log(`Final gears_used array: ${JSON.stringify(gearsUsed)}`);
        console.log(`Final gear count: ${gearCount}`);
        console.log("=================== END GEARS DEBUGGING ===================");

        // Then update the processed data with the correct gears information
        const processedData = {
          ...data,
          // Ensure numeric values are properly parsed
          total_sessions: parseInt(data.total_sessions || 0, 10),
          total_driving_time: parseFloat(data.total_driving_time || 0),
          avg_session_time: parseFloat(data.avg_session_time || 0),
          avg_fuel_consumption: parseFloat(data.avg_fuel_consumption || 0),
          avg_brake_usage: parseFloat(data.avg_brake_usage || 0),
          top_speed_ever: parseFloat(data.top_speed_ever || 0),
          avg_top_speed: parseFloat(data.avg_top_speed || 0),
          max_rpm_ever: parseFloat(data.max_rpm_ever || 0),
          wheel_speed_max: parseFloat(data.wheel_speed_max || 0),
          // Update gears data with our properly parsed values
          gears_used: gearsUsed,
          unique_gears_count: gearCount
        };

        
        setStats(processedData);

        // Process AI insights if available
        if (stats && stats.ai_insights && stats.ai_insights.performance_summary) {

          setRawPerformanceSummary(data.ai_insights.performance_summary);
        
          // Extract Coach's comments if they exist
          const coachMatch = data.ai_insights.performance_summary.match(/Coach's Corner:[\s\S]*?(?=$)/i);
          if (coachMatch) {
            setCoachComments(coachMatch[0].replace("Coach's Corner:", "").trim());
          } else {
            setCoachComments("No coaching feedback available for this session.");
          }


          // Extract insights from AI analysis
          const aiInsights = extractInsightsFromAI(stats.ai_insights.performance_summary);
          
          // Set the insights and verdict
          setGoodPoints(aiInsights.good);
          setBadPoints(aiInsights.bad);
          setVerdictText(aiInsights.verdict);
          
          // If we don't have enough insights from AI, supplement with generated ones
          const generatedInsights = generateInsightsFromStats(stats);
          
          if (aiInsights.good.length < 2) {
            setGoodPoints(prev => [...prev, ...generatedInsights.good].slice(0, 4));
          }
          
          if (aiInsights.bad.length < 2) {
            setBadPoints(prev => [...prev, ...generatedInsights.bad].slice(0, 4));
          }
          
          if (!aiInsights.verdict) {
            setVerdictText(generatedInsights.verdict);
          }
        } else if (stats) {
          // If no AI insights available, generate them from stats
          const generatedInsights = generateInsightsFromStats(stats);
          setGoodPoints(generatedInsights.good);
          setBadPoints(generatedInsights.bad);
          setVerdictText(generatedInsights.verdict);
        }
        

        
        // Process part damage data
        if (processedData.latest_part_damage) {
          try {
            const damageData = processedData.latest_part_damage;
            let parsedDamage = {};
            
            // Handle different formats of damage data
            if (typeof damageData === 'string') {
              try {
                parsedDamage = JSON.parse(damageData);
              } catch (e) {
                console.error("Error parsing damage data JSON:", e);
                parsedDamage = {};
              }
            } else if (typeof damageData === 'object') {
              parsedDamage = damageData;
            }
            
            // Calculate total damage percentage for vehicle care metric
            const damagedParts = Object.values(parsedDamage).filter(val => {
              if (typeof val === 'object' && val !== null && 'damage' in val) {
                return parseFloat(val.damage) > 0;
              }
              return parseFloat(val) > 0;
            });
            
            const totalDamage = damagedParts.length > 0 
              ? damagedParts.reduce((sum, val) => {
                  const damageValue = typeof val === 'object' && val !== null && 'damage' in val 
                    ? parseFloat(val.damage) 
                    : parseFloat(val);
                  return sum + damageValue;
                }, 0) / damagedParts.length * 100
              : 0;
            
            setVehicleCarePercentage(100 - Math.round(totalDamage));
          } catch (e) {
            console.error("Error processing part damage:", e);
            setVehicleCarePercentage(100);
          }
        } else {
          setVehicleCarePercentage(100);
        }
      } catch (err) {
        console.error('Error loading player statistics:', err);
        setError(`Failed to load player statistics: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadPlayerStats();
  }, [selectedPlayer, setIsLoading, setError]);

  useEffect(() => {
    // Calculate realistic driver score whenever stats change
    if (stats) {
      const scoreData = calculateRealisticDriverScore(stats);
      setDriverScore(scoreData.total);
      setScoreComponents(scoreData.components);
    }
  }, [stats]);

  // Fix the useEffect hook to correctly set selectedChart as an index

useEffect(() => {
  // Fetch visualization data when selectedPlayer changes
  async function fetchVisualizationData() {
    if (!selectedPlayer) return;
    
    setIsLoadingCharts(true);
    try {
      const data = await getVisualizationData(selectedPlayer);
      console.log("Visualization data:", data);
      
      if (data && data.charts && data.charts.length > 0) {
        // Process the charts data to ensure it's in the right format
        const processedCharts = data.charts.map(chart => {
          // Ensure data is an array
          let chartData = chart.data;
          if (typeof chartData === 'string') {
            try {
              chartData = JSON.parse(chartData);
            } catch (e) {
              console.error("Error parsing chart data:", e);
              chartData = [];
            }
          }
          
          // For pie charts that use object format, convert to array format
          if (chart.graph_type === 'pie' && !Array.isArray(chartData)) {
            chartData = Object.entries(chartData).map(([name, value]) => {
              // Handle when value is an object with damage property
              const damageValue = typeof value === 'object' && value !== null && 'damage' in value
                ? value.damage
                : value;
              
              const displayName = typeof value === 'object' && value !== null && 'name' in value
                ? value.name
                : name;
                
              return {
                name: displayName,
                value: parseFloat(damageValue)
              };
            });
          }
          
          return {
            ...chart,
            data: chartData
          };
        });
        
        setVisualizationData(processedCharts);
        // Set selectedChart to 0 (first chart) if no chart is selected
        if (selectedChart === null) {
          setSelectedChart(0);
        }
      }
    } catch (error) {
      console.error("Error loading visualization data:", error);
    } finally {
      setIsLoadingCharts(false);
    }
  }
  
  fetchVisualizationData();
}, [selectedPlayer, selectedChart]);
  
  // Add this function to the PlayerDashboard component
  // Update the renderVisualizationChart function in PlayerDashboard.jsx

const renderVisualizationChart = (chart) => {
  if (!chart || !chart.data || chart.data.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">No data available for this chart</p>
      </div>
    );
  }
  
  const chartHeight = 350;
  const isFuelChart = chart.title.includes('Fuel');
  const isGearChart = chart.title.includes('Gear');
  
  // Sort gear data if it's a gear distribution chart
  let chartData = chart.data;
  if (isGearChart && Array.isArray(chartData)) {
    chartData = [...chartData].sort((a, b) => {
      const gearA = typeof a.Gear === 'string' ? parseInt(a.Gear, 10) : a.Gear;
      const gearB = typeof b.Gear === 'string' ? parseInt(b.Gear, 10) : b.Gear;
      return gearA - gearB;
    });
  }
  
  switch (chart.graph_type) {
    case 'pie':
      return (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toFixed(2)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    
    case 'bar':
      return (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.x_axis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chart.y_axis} fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    
    case 'line':
      return (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chart.x_axis} 
                label={{ value: chart.x_axis, position: 'insideBottom', offset: -5 }} 
              />
              <YAxis
                domain={isFuelChart ? [0.9, 1.0] : ['auto', 'auto']}
                label={{ value: chart.y_axis, angle: -90, position: 'insideLeft' }}
                tickFormatter={isFuelChart ? (val) => val.toFixed(3) : (val) => val}
              />
              <Tooltip 
                formatter={(value) => isFuelChart ? value.toFixed(3) : value.toFixed(2)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={chart.y_axis} 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                strokeWidth={2}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    
    case 'area':
      return (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chart.x_axis} 
                label={{ value: chart.x_axis, position: 'insideBottom', offset: -5 }} 
              />
              <YAxis
                domain={isFuelChart ? [0.9, 1.0] : ['auto', 'auto']}
                label={{ value: chart.y_axis, angle: -90, position: 'insideLeft' }}
                tickFormatter={isFuelChart ? (val) => val.toFixed(3) : (val) => val}
              />
              <Tooltip 
                formatter={(value) => isFuelChart ? value.toFixed(3) : value.toFixed(2)}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={chart.y_axis} 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    
    default:
      return (
        <div className="text-center p-6">
          <p className="text-gray-500">Unsupported chart type: {chart.graph_type}</p>
        </div>
      );
  }
};
  
  // Function to create insights from stats when AI insights aren't available
  function generateInsightsFromStats(stats) {
    if (!stats) return { good: [], bad: [], verdict: "" };
    
    const goodPoints = [];
    const badPoints = [];
    let verdict = "";
    
    // Generate good points based on stats
    if (stats.speed_kmh_max || stats.wheel_speed_max || stats.top_speed_ever) {
      const topSpeed = Math.round(parseFloat(stats.speed_kmh_max || stats.wheel_speed_max || stats.top_speed_ever || 0));
      goodPoints.push(`Your top speed reached ${topSpeed} km/h, showing ${topSpeed > 100 ? 'excellent' : 'good'} acceleration capabilities.`);
    }
    
    if (stats.unique_gears_count || stats.gears_used) {
      const gearCount = stats.unique_gears_count || 
        (Array.isArray(stats.gears_used) ? stats.gears_used.length : 
        (typeof stats.gears_used === 'string' ? safeJsonParse(stats.gears_used).length : 1));
      
      if (gearCount > 3) {
        goodPoints.push(`You used ${gearCount} gears during your drive, demonstrating good understanding of gear shifting.`);
      } else {
        badPoints.push(`You only used ${gearCount} gear(s), consider using more gears for optimal performance.`);
      }
    }
    
    if (stats.max_rpm_ever || stats.rpm_max) {
      const maxRPM = Math.round(parseFloat(stats.max_rpm_ever || stats.rpm_max || 0));
      goodPoints.push(`Achieved a peak RPM of ${maxRPM.toLocaleString()}, utilizing the engine effectively.`);
    }
    
    // Generate bad points based on stats
    if (stats.brake_usage_count !== undefined) {
      const brakeCount = parseInt(stats.brake_usage_count || 0);
      if (brakeCount > 5) {
        badPoints.push(`Brake usage of ${brakeCount} indicates a need for smoother driving.`);
      } else {
        goodPoints.push(`Minimal brake usage of ${brakeCount} shows a smooth driving style.`);
      }
    }
    
    if (stats.latest_part_damage && Object.keys(stats.latest_part_damage).length > 0) {
      badPoints.push(`Vehicle damage detected indicates room for improved handling and collision avoidance.`);
    }
    
    // Generate a verdict
    const driverScore = calculateDriverScore(stats);
    if (driverScore > 80) {
      verdict = "Excellent driving performance! You've demonstrated good control, efficiency, and technical skill.";
    } else if (driverScore > 60) {
      verdict = "Good driving session with some areas for improvement. Focus on maintaining consistent performance.";
    } else {
      verdict = "This session shows several areas that need improvement. Consider focusing on smoother control and better vehicle care.";
    }
    
    return {
      good: goodPoints,
      bad: badPoints,
      verdict: verdict
    };
  }


  function safeJsonParse(jsonString, defaultValue = []) {
    if (!jsonString) {
      console.log("Gear parsing: Input is null or empty, returning default value");
      return defaultValue;
    }
    
    console.log(`Gear parsing: Input type is ${typeof jsonString}`);
    console.log(`Gear parsing: Raw input value: ${JSON.stringify(jsonString)}`);
    
    try {
      // If it's already an object, return it
      if (typeof jsonString === 'object') {
        console.log("Gear parsing: Input is already an object, returning as is");
        return Array.isArray(jsonString) ? jsonString : defaultValue;
      }
      
      // Try parsing as JSON
      console.log("Gear parsing: Attempting to parse as JSON");
      const parsed = JSON.parse(jsonString);
      console.log(`Gear parsing: Successfully parsed JSON, result: ${JSON.stringify(parsed)}`);
      return parsed;
    } catch (e) {
      console.error(`Gear parsing: Error parsing JSON: ${e.message}`);
      console.log("Gear parsing: Attempting alternative parsing methods");
      
      // Try alternative parsing methods
      if (typeof jsonString === 'string') {
        // Check if it's a stringified array with brackets
        if (jsonString.trim().startsWith('[') && jsonString.trim().endsWith(']')) {
          console.log("Gear parsing: Input looks like a stringified array");
          try {
            // Try eval as a last resort (usually not recommended but safer in this controlled context)
            const evalResult = eval(jsonString);
            console.log(`Gear parsing: Parsed with eval: ${JSON.stringify(evalResult)}`);
            return Array.isArray(evalResult) ? evalResult : defaultValue;
          } catch (evalError) {
            console.error(`Gear parsing: Eval parsing failed: ${evalError.message}`);
          }
        }
        
        // Check if it's a comma-separated list
        if (jsonString.includes(',')) {
          console.log("Gear parsing: Trying to parse as comma-separated list");
          const commaSeparated = jsonString.split(',').map(item => {
            const trimmed = item.trim();
            const asNumber = Number(trimmed);
            return isNaN(asNumber) ? trimmed : asNumber;
          });
          console.log(`Gear parsing: Comma-separated parsing result: ${JSON.stringify(commaSeparated)}`);
          return commaSeparated;
        }
        
        // Check if it's just a single number
        const asNumber = Number(jsonString);
        if (!isNaN(asNumber)) {
          console.log(`Gear parsing: Input is a single number: ${asNumber}`);
          return [asNumber];
        }
      }
      
      console.warn(`Gear parsing: All parsing methods failed, returning default value`);
      return defaultValue;
    }
  }

  // Add these functions to PlayerDashboard.jsx to parse the AI analysis data

// Function to extract insights from the performance summary
// Replace this function in PlayerDashboard.jsx
// Update this function to preserve the original text format
function extractInsightsFromAI(aiSummary) {
  if (!aiSummary) return { good: [], bad: [], verdict: "" };
  
  // Extract the verdict section if it exists
  const verdictMatch = aiSummary.match(/The Verdict:[\s\S]*?(?=Coach's Corner:|$)/i);
  const verdict = verdictMatch ? verdictMatch[0].replace("The Verdict:", "").trim() : "";
  
  // Look for sections that might contain good/bad points
  const goodPointsMatch = aiSummary.match(/The Good:[\s\S]*?(?=The Not-So-Good:|The Bad:|$)/i);
  const badPointsMatch = aiSummary.match(/(The Not-So-Good:|The Bad:)[\s\S]*?(?=Coach's Corner:|The Verdict:|$)/i);
  
  // Extract the full text sections
  const goodPoints = goodPointsMatch 
    ? extractBulletPoints(goodPointsMatch[0], true)
    : [];
    
  const badPoints = badPointsMatch 
    ? extractBulletPoints(badPointsMatch[0], true)
    : [];
  
  return {
    verdict: verdict,
    good: goodPoints,
    bad: badPoints
  };
}

// Update the extractBulletPoints function to preserve full text
function extractBulletPoints(text, preserveFull = false) {
  if (!text) return [];
  
  // Remove section title
  const contentText = text.split("\n").slice(1).join("\n");
  
  // If preserving full text, just return the content
  if (preserveFull) {
    // Try to find bullet points
    const bulletMatches = contentText.match(/[•\-\*]\s+(.*?)(?=\n[•\-\*]|\n\n|$)/gs);
    if (bulletMatches && bulletMatches.length > 0) {
      return bulletMatches
        .map(bullet => bullet.replace(/^[•\-\*]\s+/, '').trim());
    }
    
    // If no bullet points, split into sentences
    const sentences = contentText.split(/\.\s+/);
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('The'));
  }
  
  // Original filtering logic for non-preserved text
  const bulletMatches = contentText.match(/[•\-\*]\s+(.*?)(?=\n[•\-\*]|\n\n|$)/gs);
  if (bulletMatches && bulletMatches.length > 0) {
    return bulletMatches
      .map(bullet => bullet.replace(/^[•\-\*]\s+/, '').trim())
      .filter(bullet => bullet.length > 10);
  }
  
  const sentences = contentText.split(/\.\s+/);
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('The'));
}

function calculateRealisticDriverScore(stats) {
  if (!stats) return { total: 50, components: {} };
  
  // Base score components (total: 100 points)
  let speedScore = 0;         // Max 20 points
  let controlScore = 0;       // Max 25 points
  let efficiencyScore = 0;    // Max 20 points
  let techniqueScore = 0;     // Max 20 points
  let vehicleCareScore = 0;   // Max 15 points
  
  // Speed score - based on top speed achieved
  const topSpeed = parseFloat(stats.speed_kmh_max || stats.wheel_speed_max || stats.top_speed_ever || 0);
  speedScore = Math.min(20, Math.round(topSpeed / 8));
  
  // Control score - based on brake usage and steering changes
  const brakeUsage = parseInt(stats.brake_usage_count || stats.avg_brake_usage || 0);
  const steeringChanges = parseFloat(stats.steering_changes || 0);
  
  // Lower brake usage is better (up to a point)
  const brakeScore = brakeUsage < 3 ? 10 : brakeUsage < 8 ? 15 - brakeUsage : 5;
  
  // Moderate steering changes are ideal
  const steeringScore = steeringChanges < 5 ? 5 : 
    steeringChanges < 20 ? 10 : 
    steeringChanges < 50 ? 8 : 5;
  
  controlScore = brakeScore + steeringScore;
  
  // Efficiency score - based on fuel consumption
  const fuelConsumption = parseFloat(stats.avg_fuel_consumption || 0);
  efficiencyScore = Math.min(20, Math.max(5, 20 - Math.round(fuelConsumption * 200)));
  
  // Technique score - based on gear usage and RPM management
  const gearCount = stats.unique_gears_count || (stats.gears_used ? (Array.isArray(stats.gears_used) ? stats.gears_used.length : 1) : 1);
  const maxRPM = parseFloat(stats.max_rpm_ever || stats.rpm_max || 0);
  
  const gearScore = Math.min(10, gearCount * 3);
  const rpmScore = maxRPM > 6000 ? 10 : maxRPM > 4000 ? 8 : maxRPM > 2000 ? 5 : 3;
  
  techniqueScore = gearScore + rpmScore;
  
  // Vehicle care score - based on damage
  const damageData = stats.latest_part_damage || {};
  const damagedParts = Object.keys(damageData).length;
  
  vehicleCareScore = damagedParts === 0 ? 15 : 
    damagedParts < 3 ? 10 : 
    damagedParts < 5 ? 5 : 2;
  
  // Calculate total score
  const totalScore = speedScore + controlScore + efficiencyScore + techniqueScore + vehicleCareScore;
  
  // Return the score and component breakdown for detailed display
  return {
    total: totalScore,
    components: {
      speed: speedScore / 20 * 100,
      control: controlScore / 25 * 100,
      efficiency: efficiencyScore / 20 * 100,
      technique: techniqueScore / 20 * 100,
      vehicleCare: vehicleCareScore / 15 * 100
    }
  };
}

// Function to create concise insights if AI analysis is not available or not helpful
function generateConciseInsights(stats) {
  const insights = [];
  
  // Top speed insight
  if (stats.speed_kmh_max || stats.wheel_speed_max) {
    const topSpeed = Math.round(parseFloat(stats.speed_kmh_max || stats.wheel_speed_max || 0));
    insights.push({
      type: 'good',
      text: `Your top speed reached ${topSpeed} km/h, showing ${topSpeed > 100 ? 'excellent' : 'good'} acceleration capabilities.`
    });
  }
  
  // Gear usage insight
  if (stats.unique_gears_count || stats.gears_used) {
    const gearCount = stats.unique_gears_count || 
                     (Array.isArray(stats.gears_used) ? stats.gears_used.length : 
                     (typeof stats.gears_used === 'string' ? JSON.parse(stats.gears_used).length : 1));
    insights.push({
      type: gearCount > 3 ? 'good' : 'neutral',
      text: `You used ${gearCount} gears during your drive, demonstrating your ${gearCount > 3 ? 'good understanding' : 'basic knowledge'} of gear shifting.`
    });
  }
  
  // Brake usage insight
  if (stats.brake_usage_count !== undefined) {
    const brakeCount = parseInt(stats.brake_usage_count || 0);
    insights.push({
      type: brakeCount < 5 ? 'good' : 'bad',
      text: `Brake usage of ${brakeCount} indicates a ${brakeCount < 5 ? 'smooth driving style' : 'need for smoother driving'}.`
    });
  }
  
  // RPM insight
  if (stats.max_rpm_ever || stats.rpm_max) {
    const maxRPM = Math.round(parseFloat(stats.max_rpm_ever || stats.rpm_max || 0));
    insights.push({
      type: 'good',
      text: `Achieved a peak RPM of ${maxRPM.toLocaleString()}, utilizing the engine effectively.`
    });
  }
  
  // Vehicle damage insight if available
  if (stats.latest_part_damage && Object.keys(stats.latest_part_damage).length > 0) {
    insights.push({
      type: 'bad',
      text: `Vehicle damage indicates room for improved handling and collision avoidance.`
    });
  }
  
  return insights;
}
  

  // Add this function after your other helper functions
function extractVerdict(analysisText) {
  if (!analysisText) return '';
  
  const verdictMatch = analysisText.match(/The Verdict:[\s\S]*?(?=Coach's Corner:|$)/i);
  if (verdictMatch) {
    return verdictMatch[0].replace("The Verdict:", "").trim();
  }
  return "Performance analysis not available.";
}

  

  // Extract key insights from a lengthy AI analysis
  function extractKeyInsights(analysisText, maxPoints = 4) {
    if (!analysisText) return [];
    
    // Try to find sections that look like bullet points or paragraphs
    const bulletMatches = analysisText.match(/[•\-\*]\s+(.*?)(?=\n[•\-\*]|\n\n|$)/gs);
    if (bulletMatches && bulletMatches.length > 0) {
      return bulletMatches
        .map(bullet => bullet.replace(/^[•\-\*]\s+/, '').trim())
        .filter(bullet => bullet.length > 10 && bullet.length < 100)
        .slice(0, maxPoints);
    }
    
    // If no bullet points, split into paragraphs and use the first few
    const paragraphs = analysisText.split(/\n\n+/);
    return paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 10 && p.length < 100)
      .slice(0, maxPoints);
  }
  

  const extractSectionFromSummary = (summary, sectionTitle) => {
    if (!summary) return [];
    
    try {
      const sectionRegex = new RegExp(`${sectionTitle}([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`, 'i');
      const sectionMatch = summary.match(sectionRegex);
      
      if (!sectionMatch) return [];
      
      // Extract bullet points (lines starting with * or number followed by *)
      const bulletPoints = sectionMatch[1].split('\n')
        .filter(line => line.trim().match(/^\*\s+|^\d+\.\s+\*\*/))
        .map(line => line.trim());
      
      return bulletPoints;
    } catch (e) {
      console.error("Error extracting section:", e);
      return [];
    }
  };

  function calculateDriverScore(stats) {
    // Base score out of 100
    let score = 70;
    
    // Adjust score based on stats
    if (stats && parseFloat(stats.top_speed_ever) > 80) score += 5; // Reward reaching high speed
    if (stats && parseFloat(stats.avg_brake_usage) < 5) score += 5; // Reward efficient brake usage
    if (stats && parseFloat(stats.avg_fuel_consumption) < 0.1) score += 5; // Reward fuel efficiency
    if (stats && parseInt(stats.total_sessions) > 5) score += 5; // Reward experience
    
    // Penalize if there are many DTC codes
    if (stats && stats.dtc_occurrence && stats.dtc_occurrence.length > 3) {
      score -= 5; 
    }
    
    // Improvement bonus
    if (stats && stats.improvement) {
      if (parseFloat(stats.improvement.top_speed_change) > 0) score += 3;
      if (parseFloat(stats.improvement.brake_usage_change) < 0) score += 3;
      if (parseFloat(stats.improvement.fuel_efficiency_change) > 0) score += 3;
    }
    
    // Ensure score stays within 0-100 range
    return Math.min(Math.max(Math.round(score), 0), 100);
  }
  
  if (!stats || parseInt(stats.total_sessions || 0) === 0) {
    return (
      <div className="bg-white shadow rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">Driver Dashboard</h2>
          <p className="text-blue-100 text-sm">Performance tracking and analytics</p>
        </div>
        
        <div className="p-6 text-center">
          <div className="max-w-md mx-auto">
            <img 
              src="/api/placeholder/400/200" 
              alt="No data illustration" 
              className="mx-auto mb-4 rounded-lg"
            />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Driving Data Available</h3>
            <p className="text-gray-600 mb-4">Complete driving sessions in the simulator to see your performance analytics.</p>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-700">How to Generate Data</h3>
              <ol className="list-decimal list-inside mt-2 text-blue-800 text-sm space-y-1">
                <li>Go to the original simulator at <a href="http://localhost:8000" className="underline font-medium" target="_blank" rel="noopener noreferrer">http://localhost:8000</a></li>
                <li>Enter a player ID and run the simulation</li>
                <li>Return to this dashboard to view your performance metrics</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Process trend data for visualizations
  const trendData = stats.trend_data
    ? stats.trend_data.map((session, index) => {
        // Format date for display
        const date = new Date(session.timestamp);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        return {
          index: index + 1,
          sessionNumber: index + 1,
          date: dateStr,
          topSpeed: parseFloat(session.speed_kmh || session.top_speed || session.wheel_speed_max || 0),
          brakeUsage: parseInt(session.brake_usage_count, 10),
          fuelConsumption: parseFloat(session.fuel_consumption) * 100, // Convert to percentage
          acceleration: Math.round(Math.sqrt(
            Math.pow(parseFloat(session.accX_mean || 0), 2) + 
            Math.pow(parseFloat(session.accY_mean || 0), 2) + 
            Math.pow(parseFloat(session.accZ_mean || 0), 2)
          ) * 10) / 10, // Combined acceleration magnitude
          rpm: parseFloat(session.rpm_max) / 1000, // RPM in thousands
          steering: parseFloat(session.steering_changes || 0) / 100 // Scaled steering changes
        };
      })
    : [];

  // Format DTC code data for chart
  const dtcData = stats.dtc_occurrence
    ? stats.dtc_occurrence.map(item => ({
        code: item.code,
        occurrences: parseInt(item.occurrences, 10)
      })).slice(0, 5) // Limit to top 5 for better visualization
    : [];
  
  // Performance metrics for summary cards
  const performanceMetrics = [
    { 
      title: 'Top Speed', 
      value: `${Math.round(parseFloat(stats.speed_kmh_max || stats.wheel_speed_max || stats.top_speed_ever || 0))} km/h`, 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      color: 'bg-blue-500' 
    },,
    { 
      title: 'Total Drive Time', 
      value: `${stats.total_driving_time ? 
        (parseFloat(stats.total_driving_time) >= 60 ? 
          `${Math.floor(parseFloat(stats.total_driving_time) / 60)}.${Math.round((parseFloat(stats.total_driving_time) % 60) / 60 * 100).toString().padStart(2, '0')} min` : 
          `${parseFloat(stats.total_driving_time).toFixed(2)} sec`)
        : '0.00 sec'}`, 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
      color: 'bg-green-500' 
    },
    { 
      title: 'Avg Fuel Usage', 
      value: `${stats.avg_fuel_consumption ? 
        (parseFloat(stats.avg_fuel_consumption) < 0 ? 
          `+${Math.abs(parseFloat(stats.avg_fuel_consumption) * 100).toFixed(2)}%` :
          `${(parseFloat(stats.avg_fuel_consumption) * 100).toFixed(2)}%`) 
        : '0.00%'}`, 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l.707.707L15 4.414l.707-.707a1 1 0 111.414 1.414l-.707.707 1.414 1.414a1 1 0 01-1.414 1.414L15 7.242l-.707.707a1 1 0 11-1.414-1.414l.707-.707-1.414-1.414A1 1 0 0112 2z" clipRule="evenodd" />
        </svg>
      ),
      color: parseFloat(stats.avg_fuel_consumption) < 0 ? 'bg-green-600' : 'bg-orange-500'
    },
    { 
      title: 'Sessions', 
      value: parseInt(stats.total_sessions || 1, 10), 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      color: 'bg-purple-500' 
    }
    
  ];
  
  const additionalMetrics = [
    {
      title: 'Max RPM',
      value: `${Math.round(parseFloat(stats.max_rpm_ever || stats.rpm_max || 0)).toLocaleString()}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0v-4a1 1 0 112 0v4z" clipRule="evenodd" />
          <path d="M10 6a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      ),
      color: 'bg-red-500'
    },
    {
      title: 'Avg Acceleration',
      value: `${stats.accX_mean ? 
        Math.round(Math.sqrt(
          Math.pow(parseFloat(stats.accX_mean || 0), 2) + 
          Math.pow(parseFloat(stats.accY_mean || 0), 2) + 
          Math.pow(parseFloat(stats.accZ_mean || 0), 2)
        ) * 10) / 10
        : '0.0'} g`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      color: 'bg-yellow-500'
    },
    {
      title: 'Gears Used',
      value: `${stats.unique_gears_count || (stats.gears_used ? (typeof stats.gears_used === 'string' ? JSON.parse(stats.gears_used).length : stats.gears_used.length) : 0)}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      color: 'bg-indigo-500'
    },
    {
      title: 'Brake Usage',
      value: `${parseInt(stats.brake_usage_count || 0, 10)}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      color: 'bg-cyan-500'
    }
  ];

  // Navigation sections
  const sections = [
    { id: 'vehicle', label: 'Vehicle Damage' },
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance Trends' },
    { id: 'diagnostics', label: 'Diagnostics' }
  ];
  
  // Parse damage data for visualization
  let damageData = {};
  if (stats.latest_part_damage) {
    try {
      damageData = typeof stats.latest_part_damage === 'string' 
        ? JSON.parse(stats.latest_part_damage)
        : stats.latest_part_damage;
    } catch (e) {
      console.error("Error parsing damage data:", e);
    }
  }
  
  // Helper function to create sample trend data if real data is missing
  const getSampleTrendData = (sessions = 3) => {
    return Array.from({ length: sessions }, (_, i) => ({
      index: i + 1,
      sessionNumber: i + 1,
      date: new Date(Date.now() - (i * 86400000)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      topSpeed: 40 + Math.random() * 40,
      brakeUsage: Math.floor(Math.random() * 10),
      fuelConsumption: 5 + Math.random() * 15,
      acceleration: 0.5 + Math.random() * 1.5,
      rpm: 3 + Math.random() * 5,
      steering: 5 + Math.random() * 15
    }));
  };

  const formatMarkdownText = (text) => {
    if (!text) return '';
    
    // Replace ** for bold text
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace * for italic text
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedText;
  };

  

  // Use sample data if trend data is empty
  const displayTrendData = trendData.length > 0 ? trendData : getSampleTrendData();

  return (
    <div className="space-y-6">
      {/* Dashboard header & navigation */}
      <div className="bg-white shadow rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-xl font-bold">Driver Dashboard</h2>
              <p className="text-blue-100 text-sm">
                Performance tracking and analytics for <span className="font-semibold">{selectedPlayer}</span>
              </p>
            </div>
            
            {/* Player selection dropdown */}
            <div className="w-64">
            <select 
            className="w-full px-3 py-2 bg-blue-700 text-white rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedPlayer || ""}
            onChange={(e) => {
              const newPlayerId = e.target.value;
              
              // Update local state first
              setSelectedPlayer(newPlayerId);
              
              // Then update the global context if it's available
              if (typeof setPlayerId === 'function') {
                setPlayerId(newPlayerId);
              }
              
              console.log(`Selected player changed to: ${newPlayerId}`);
            }}
          >
            <option value="">Select Player</option>
            {playerList.map(player => (
              <option key={player.player_id} value={player.player_id}>
                {player.player_id} - Last session: {new Date(player.last_session).toLocaleDateString()}
              </option>
            ))}
          </select>
            </div>
          </div>
          
          {/* Section navigation */}
          <div className="flex mt-4 space-x-2 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeSection === section.id
                    ? 'bg-white text-blue-700'
                    : 'bg-blue-700 bg-opacity-50 text-white hover:bg-opacity-70'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Key metrics */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
              <div className={`${metric.color} p-2 rounded-lg text-white mr-3`}>
                {metric.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{metric.title}</p>
                <p className="font-semibold text-lg">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Additional metrics */}
      <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {additionalMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
            <div className={`${metric.color} p-2 rounded-lg text-white mr-3`}>
              {metric.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{metric.title}</p>
              <p className="font-semibold text-lg">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
      </div>
      
      {/* Section content */}
      {activeSection === 'vehicle' && (
        <div className="space-y-6">
          {/* Vehicle Damage Visualization */}
          <VehicleDamageVisualization damageData={damageData} />
          
          {/* Key AI Insights in Cards */}
          {/* Key Performance Insights */}
<div className="bg-white shadow rounded-xl p-6">
  <h3 className="text-lg font-semibold mb-4">Key Performance Insights</h3>
  
  {stats.ai_insights && stats.ai_insights.performance_summary ? (
    <div className="space-y-6">
      {/* The Good section */}
      <div>
        <h4 className="font-medium text-green-700 mb-2">The Good:</h4>
        <div className="space-y-3">
          {extractSectionFromSummary(stats.ai_insights.performance_summary, "The Good:").map((point, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-2 mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div 
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatMarkdownText(point) }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* The Not-So-Good section */}
      <div>
        <h4 className="font-medium text-red-700 mb-2">The Not-So-Good:</h4>
        <div className="space-y-3">
          {extractSectionFromSummary(stats.ai_insights.performance_summary, "The Not-So-Good:").map((point, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-2 mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div 
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatMarkdownText(point) }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Advanced Insights section */}
      <div>
        <h4 className="font-medium text-purple-700 mb-2">Advanced Insights:</h4>
        <div className="space-y-3">
          {extractSectionFromSummary(stats.ai_insights.performance_summary, "Advanced Insights:").map((point, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 rounded-full p-2 mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div 
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatMarkdownText(point) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )  : (
              // If no AI insights are available, provide default insights based on metrics
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full mr-3 mt-1" style={{backgroundColor: `${COLORS[0]}20`}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{color: COLORS[0]}} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                      Your top speed reached {Math.round(parseFloat(stats.speed_kmh_max || 0))} kmph, showing good acceleration capabilities.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full mr-3 mt-1" style={{backgroundColor: `${COLORS[1]}20`}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{color: COLORS[1]}} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                      You used {stats.unique_gears_count || 2} gears during your drive, demonstrating your understanding of optimal gear shifting.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full mr-3 mt-1" style={{backgroundColor: `${COLORS[2]}20`}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{color: COLORS[2]}} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                      Brake usage of {parseInt(stats.brake_usage_count || 0)} indicates a {parseInt(stats.brake_usage_count || 0) > 5 ? 'need for smoother driving' : 'smooth driving style'}.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full mr-3 mt-1" style={{backgroundColor: `${COLORS[3]}20`}}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{color: COLORS[3]}} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                      The Good: Achieved a peak RPM of {Math.round(parseFloat(stats.max_rpm_ever || stats.rpm_max || 0)).toLocaleString()}, utilizing the engine effectively.
                      <br/>
                      The Not So Good: Vehicle damage indicates room for improved handling and collision avoidance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="bg-white shadow rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Top Speed (km/h)', value: Math.round(parseFloat(stats.speed_kmh_max || stats.wheel_speed_max || stats.top_speed_ever || 0)) },
                  { name: 'Avg. Speed (km/h)', value: Math.round(parseFloat(stats.speed_kmh_mean || stats.avg_top_speed || 0)) },
                  { name: 'Avg. Brake Uses', value: Math.round(parseFloat(stats.avg_brake_usage || stats.brake_usage_count || 0)) },
                  { name: 'Fuel Usage (%)', value: Math.round(parseFloat(stats.avg_fuel_consumption || 0) * 100) },
                  { name: 'Max RPM (÷1000)', value: Math.round(parseFloat(stats.max_rpm_ever || stats.rpm_max || 0) / 1000) }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {performanceMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Add this section to the Performance Overview in the 'overview' activeSection */}
          {/* Coach's Comments */}
          <div className="bg-white shadow rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Coach's Corner</h3>
            
            {stats.ai_insights && extractSectionFromSummary(stats.ai_insights.performance_summary, "Coach's Corner:").length > 0 ? (
              <div className="space-y-3"> {/* Optional: Add spacing between points */}
              {extractSectionFromSummary(stats.ai_insights.performance_summary, "Coach's Corner:").map((point, index) => (
                <div
                  key={index}
                  className="text-gray-700" // Apply basic text styling
                  dangerouslySetInnerHTML={{ __html: formatMarkdownText(point) }}
                />
              ))}
            </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-gray-700">No coaching feedback available for this session.</p>
              </div>
            )}
          </div>

         {/* Driver Score Card with visualization */}
        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Driver Performance Score</h3>
            
            {/* Score explanation toggle button */}
            <button 
              onClick={() => setShowScoreExplanation(prev => !prev)}
              className="text-blue-600 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              How is this calculated?
            </button>
          </div>
          
          {/* Score explanation panel */}
          {showScoreExplanation && (
            <div className="mb-4 bg-blue-50 p-4 rounded-lg text-sm">
              <h4 className="font-medium text-blue-800 mb-2">Score Calculation Methodology</h4>
              <p className="text-blue-700 mb-2">Your driver score (out of 100) is calculated based on 5 key performance areas:</p>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li><span className="font-medium">Speed (20 points):</span> Based on top speed achieved and acceleration patterns</li>
                <li><span className="font-medium">Control (25 points):</span> Measures brake usage and steering consistency</li>
                <li><span className="font-medium">Efficiency (20 points):</span> Evaluates fuel consumption and resource management</li>
                <li><span className="font-medium">Technique (20 points):</span> Assesses gear usage and RPM management</li>
                <li><span className="font-medium">Vehicle Care (15 points):</span> Reflects vehicle damage and maintenance</li>
              </ul>
              <p className="text-blue-700 mt-2">Higher percentages in each category indicate better performance.</p>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-40 h-40">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                  />
                  
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={driverScore > 70 ? "#10b981" : driverScore > 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 45 * driverScore / 100} ${2 * Math.PI * 45 * (1 - driverScore / 100)}`}
                    strokeDashoffset={2 * Math.PI * 45 * 0.25}
                    transform="rotate(-90 50 50)"
                  />
                  
                  {/* Score text */}
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="24"
                    fontWeight="bold"
                    fill="#1f2937"
                  >
                    {driverScore}
                  </text>
                  
                  <text
                    x="50"
                    y="65"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    out of 100
                  </text>
                </svg>
              </div>
            </div>
            
            <div className="md:w-2/3">
              <h4 className="font-medium text-lg mb-2">Performance Analysis</h4>
              <div className="space-y-4">
                {/* Speed Score */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Speed</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(scoreComponents?.speed || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${Math.round(scoreComponents?.speed || 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Driving Control */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Driving Control</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(scoreComponents?.control || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.round(scoreComponents?.control || 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Fuel Efficiency */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Fuel Efficiency</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(scoreComponents?.efficiency || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${Math.round(scoreComponents?.efficiency || 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Technique */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Technique</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(scoreComponents?.technique || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${Math.round(scoreComponents?.technique || 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Vehicle Care */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Vehicle Care</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(scoreComponents?.vehicleCare || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ width: `${Math.round(scoreComponents?.vehicleCare || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
         {/* The Verdict Section */}
         <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">The Verdict</h4>
          <div 
            className="text-blue-700"
            dangerouslySetInnerHTML={{
              __html: stats.ai_insights && stats.ai_insights.performance_summary ?
                formatMarkdownText(extractVerdict(stats.ai_insights.performance_summary)) : // <-- Use extractVerdict here
                "No verdict available for this session." // This fallback might be overridden by extractVerdict's own fallback
            }}
          />
        </div>
        </div>


                 </div>
          
          )}

      
      
{activeSection === 'performance' && (
  <div className="space-y-6">
    {/* Visualization Data Charts */}
    <div className="bg-white shadow rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Vehicle Telemetry Visualization</h3>
      
      {isLoadingCharts ? (
        <div className="flex justify-center items-center h-72">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : visualizationData.length > 0 ? (
        <div>
          {/* Remove the chart selector tabs and display all charts */}
          <div className="space-y-6">
            {visualizationData.map((chart, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">{chart.title}</h4>
                {renderVisualizationChart(chart)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No visualization data available. Complete a session to see detailed charts.</p>
          <p className="text-gray-400 text-sm mt-2">Run a simulation from the original UI at http://localhost:8000</p>
        </div>
      )}
    </div>
    
          
          {/* Driving Style Assessment */}
          <div className="bg-white shadow rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Driving Style Assessment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  <h4 className="font-medium">Speed Profile</h4>
                </div>
                <p className="text-sm text-blue-700">
                {parseFloat(stats.speed_kmh_max || stats.avg_top_speed || stats.wheel_speed_max || 0) > 100 ? 'Aggressive driver who pushes for speed' : 
                parseFloat(stats.speed_kmh_max || stats.avg_top_speed || stats.wheel_speed_max || 0) > 60 ? 'Balanced approach to speed' : 
                'Conservative driver who prioritizes control'}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-medium">Efficiency Score</h4>
                </div>
                <p className="text-sm text-green-700">
                  {parseFloat(stats.avg_fuel_consumption || 0) < 0.05 ? 'Excellent fuel economy' :
                   parseFloat(stats.avg_fuel_consumption || 0) < 0.1 ? 'Good fuel management' :
                   'Room for improvement in efficiency'}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-medium">Experience Level</h4>
                </div>
                <p className="text-sm text-purple-700">
                  {parseInt(stats.total_sessions || 1, 10) > 10 ? 'Veteran driver with strong track record' :
                   parseInt(stats.total_sessions || 1, 10) > 5 ? 'Experienced driver showing consistent improvement' :
                   'Beginner still developing core driving skills'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeSection === 'diagnostics' && (
        <div className="space-y-6">
        
          
          
          {/* Compact Diagnostic Analysis */}
{stats.ai_insights && stats.ai_insights.dtc_analysis && (
  <div className="bg-white shadow rounded-xl p-6">
    <h3 className="text-lg font-semibold mb-4">Diagnostic Summary</h3>

    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div 
        className="prose max-w-none text-gray-700 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: formatMarkdownText(stats.ai_insights.dtc_analysis) }}
      />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0 bg-yellow-100 rounded-full p-2 mr-3 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="font-medium mb-2">DTC Analysis</h4>
          <div className="prose max-w-none text-sm text-gray-700">
            {extractKeyInsights(stats.ai_insights.dtc_analysis, 2).map((insight, index) => (
              <p key={index} className="mb-2">{insight}</p>
            ))}
            
            <button 
              className="text-blue-600 text-xs hover:underline font-medium mt-2 inline-flex items-center"
              onClick={() => alert("Full diagnostic report would be displayed in a modal")}
            >
              View Full Diagnostic Report
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-red-50 p-4 rounded-lg">
        <h4 className="font-medium text-red-700 mb-2">Critical Issues</h4>
        <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
          <li>Engine performance compromised</li>
          <li>Potential fuel system issues</li>
          <li>Check cooling system integrity</li>
        </ul>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-700 mb-2">Recommended Actions</h4>
        <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
          <li>Schedule diagnostic check</li>
          <li>Review driving habits to reduce engine strain</li>
          <li>Monitor fluid levels more regularly</li>
        </ul>
      </div>
    </div>
  </div>
)}
          
          {/* DTC Code Descriptions */}
          {dtcData.length > 0 && (
            <div className="bg-white shadow rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Diagnostic Code Definitions</h3>
              <div className="space-y-3">
                {dtcData.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <div className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-sm font-medium mr-2">
                        {item.code}
                      </div>
                      <div className="text-gray-500 text-sm">
                        Detected {item.occurrences} {item.occurrences === 1 ? 'time' : 'times'}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {getCodeDescription(item.code)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Quick actions footer */}
      <div className="flex justify-center mt-6">
      <button 
        onClick={async () => {
          try {
            setIsLoading(true);
            
            // Call the simplified refreshDashboardData function
            const result = await refreshDashboardData();
            console.log('Dashboard data refreshed:', result);
            
            // Show success message
            alert('Dashboard data refreshed successfully! The page will reload to show updated data.');
            
            // Reload the page to display the fresh data
            window.location.reload();
          } catch (error) {
            console.error('Error refreshing dashboard data:', error);
            alert(`Error refreshing data: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Refresh Dashboard Data
      </button>
    </div>
    <ChatInterface />
    </div>
  );
}


// Helper function to get DTC code descriptions (simplified)
function getCodeDescription(code) {
  const descriptions = {
    'P0100': 'Mass or Volume Air Flow Circuit Malfunction',
    'P0101': 'Mass or Volume Air Flow Circuit Range/Performance Problem',
    'P0102': 'Mass or Volume Air Flow Circuit Low Input',
    'P0103': 'Mass or Volume Air Flow Circuit High Input',
    'P0104': 'Mass or Volume Air Flow Circuit Intermittent',
    'P0105': 'Manifold Absolute Pressure/Barometric Pressure Circuit Malfunction',
    'P0106': 'Manifold Absolute Pressure/Barometric Pressure Circuit Range/Performance Problem',
    'P0107': 'Manifold Absolute Pressure/Barometric Pressure Circuit Low Input',
    'P0108': 'Manifold Absolute Pressure/Barometric Pressure Circuit High Input',
    'P0109': 'Manifold Absolute Pressure/Barometric Pressure Circuit Intermittent',
    'P0110': 'Intake Air Temperature Circuit Malfunction',
    'P0111': 'Intake Air Temperature Circuit Range/Performance Problem',
    'P0112': 'Intake Air Temperature Circuit Low Input',
    'P0113': 'Intake Air Temperature Circuit High Input',
    'P0114': 'Intake Air Temperature Circuit Intermittent',
    'P0115': 'Engine Coolant Temperature Circuit Malfunction',
    'P0116': 'Engine Coolant Temperature Circuit Range/Performance Problem',
    'P0117': 'Engine Coolant Temperature Circuit Low Input',
    'P0118': 'Engine Coolant Temperature Circuit High Input',
    'P0119': 'Engine Coolant Temperature Circuit Intermittent',
    'P0120': 'Throttle/Pedal Position Sensor/Switch A Circuit Malfunction',
    'P0121': 'Throttle/Pedal Position Sensor/Switch A Circuit Range/Performance Problem',
    'P0122': 'Throttle/Pedal Position Sensor/Switch A Circuit Low Input',
    'P0123': 'Throttle/Pedal Position Sensor/Switch A Circuit High Input',
    'P0124': 'Throttle/Pedal Position Sensor/Switch A Circuit Intermittent',
    'P0147': 'O2 Sensor Heater Circuit Malfunction (Bank 1, Sensor 3)'
  };
  
  // Return description if available, otherwise provide a generic message
  return descriptions[code] || 'Engine or transmission issue detected. Refer to vehicle service manual for specific details.';
}

export default PlayerDashboard;