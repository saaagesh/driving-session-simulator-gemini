import React, { useState, useEffect } from 'react';

const VehicleDamageVisualization = ({ damageData }) => {
  // Color scale for damage severity
  const getColorForDamage = (damage) => {
    if (damage === 0) return '#e0e0e0'; // No damage - light gray
    if (damage < 0.25) return '#ffeb3b'; // Minor damage - yellow
    if (damage < 0.5) return '#ff9800';  // Moderate damage - orange 
    if (damage < 0.75) return '#ff5722'; // Severe damage - deep orange
    return '#f44336';                    // Critical damage - red
  };

  // Part positions updated to match BeamNG top-down view
  const vehicleParts = {
    radiator: { name: 'Radiator', x: 240, y: 130, width: 80, height: 30 },
    nosecone: { name: 'Nosecone', x: 240, y: 170, width: 90, height: 40 },
    hood: { name: 'Hood', x: 240, y: 220, width: 100, height: 50 },
    frontleft_fender: { name: 'Front Left Fender', x: 160, y: 180, width: 50, height: 90 },
    frontright_fender: { name: 'Front Right Fender', x: 320, y: 180, width: 50, height: 90 },
    engine: { name: 'Engine', x: 240, y: 260, width: 70, height: 50 },
    transmission: { name: 'Transmission', x: 240, y: 320, width: 60, height: 40 },
    steering: { name: 'Steering', x: 240, y: 290, width: 80, height: 30 },
    suspension_front: { name: 'Front Suspension', x: 240, y: 370, width: 180, height: 30 },
    suspension_rear: { name: 'Rear Suspension', x: 240, y: 550, width: 180, height: 30 },
    wheel_fl: { name: 'Front Left Wheel', x: 140, y: 200, width: 50, height: 60 },
    wheel_fr: { name: 'Front Right Wheel', x: 340, y: 200, width: 50, height: 60 },
    wheel_rl: { name: 'Rear Left Wheel', x: 140, y: 450, width: 50, height: 60 },
    wheel_rr: { name: 'Rear Right Wheel', x: 340, y: 450, width: 50, height: 60 },
    body: { name: 'Body', x: 240, y: 380, width: 150, height: 120 },
    fuel_tank: { name: 'Fuel Tank', x: 240, y: 470, width: 70, height: 40 },
    exhaust: { name: 'Exhaust', x: 300, y: 500, width: 60, height: 25 }
  };

  // Normalize damage data to match our component
  const [partDamage, setPartDamage] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [totalDamage, setTotalDamage] = useState(0);
  
  useEffect(() => {
    // Process damage data when it changes
    if (damageData && typeof damageData === 'object' && Object.keys(damageData).length > 0) {
      processVehicleDamageData(damageData);
    } else {
      // Create empty state for visualization
      const emptyData = {};
      Object.keys(vehicleParts).forEach(part => {
        emptyData[part] = 0;
      });
      setPartDamage(emptyData);
      setTotalDamage(0);
    }
  }, [damageData]);

  // Process and map BeamNG damage data to our visualization format
  const processVehicleDamageData = (data) => {
    console.log("Processing damage data:", data);
    
    // Normalize and map damage data to part names
    const normalized = {};
    Object.entries(data).forEach(([key, value]) => {
      let partName = key.toLowerCase();
      let damageValue = 0;
      
      // Extract damage value based on data format
      if (typeof value === 'object' && value !== null && 'damage' in value) {
        damageValue = parseFloat(value.damage);
      } else if (typeof value === 'number') {
        damageValue = value;
      } else if (typeof value === 'string') {
        try {
          damageValue = parseFloat(value);
        } catch (e) {
          console.error("Error parsing damage value", e);
          damageValue = 0;
        }
      }
      
      // Map BeamNG part names to our visualization parts
      let mappedPart = mapBeamNGPartToVisualization(partName);
      
      if (mappedPart && (!normalized[mappedPart] || normalized[mappedPart] < damageValue)) {
        normalized[mappedPart] = damageValue;
      }
    });
    
    // Calculate total damage percentage
    const damagedParts = Object.values(normalized).filter(val => val > 0);
    const avgDamage = damagedParts.length > 0 
      ? damagedParts.reduce((sum, val) => sum + val, 0) / damagedParts.length
      : 0;
    
    setTotalDamage(Math.round(avgDamage * 100));
    setPartDamage(normalized);
    
    console.log("Normalized damage data:", normalized);
  };

  // Map BeamNG part names to our visualization parts
  const mapBeamNGPartToVisualization = (partName) => {
    // Common prefixes in BeamNG that we can strip
    const prefixes = ['bolide_', 'vehicle_', 'car_'];
    prefixes.forEach(prefix => {
      if (partName.startsWith(prefix)) {
        partName = partName.substring(prefix.length);
      }
    });
    
    // Map specific part names
    if (partName.includes('hood') || partName.includes('frunk')) {
      return 'hood';
    } else if ((partName.includes('fender') || partName.includes('headlight')) && 
               (partName.includes('_r') || partName.includes('right'))) {
      return 'frontright_fender';
    } else if ((partName.includes('fender') || partName.includes('headlight')) && 
               (partName.includes('_l') || partName.includes('left'))) {
      return 'frontleft_fender';
    } else if (partName.includes('engine') || partName.includes('motor')) {
      return 'engine';
    } else if (partName.includes('steer')) {
      return 'steering';
    } else if (partName.includes('body')) {
      return 'body';
    } else if ((partName.includes('suspension') || partName.includes('subframe')) && 
               partName.includes('_f')) {
      return 'suspension_front';
    } else if ((partName.includes('suspension') || partName.includes('subframe')) && 
               partName.includes('_r')) {
      return 'suspension_rear';
    } else if (partName.includes('radiator')) {
      return 'radiator';
    } else if (partName.includes('nosecone')) {
      return 'nosecone';
    } else if (partName.includes('wheel') && 
               (partName.includes('_fl') || partName.includes('front_left'))) {
      return 'wheel_fl';
    } else if (partName.includes('wheel') && 
               (partName.includes('_fr') || partName.includes('front_right'))) {
      return 'wheel_fr';
    } else if (partName.includes('wheel') && 
               (partName.includes('_rl') || partName.includes('rear_left'))) {
      return 'wheel_rl';
    } else if (partName.includes('wheel') && 
               (partName.includes('_rr') || partName.includes('rear_right'))) {
      return 'wheel_rr';
    } else if (partName.includes('tank') || partName.includes('fuel')) {
      return 'fuel_tank';
    } else if (partName.includes('exhaust') || partName.includes('muffler')) {
      return 'exhaust';
    } else if (partName.includes('transmission') || partName.includes('gearbox')) {
      return 'transmission';
    }
    
    // Default case - no match found
    return null;
  };

  // Handle part click
  const handlePartClick = (part) => {
    setSelectedPart(part === selectedPart ? null : part);
  };

  // Generate part style based on damage level
  const getPartStyle = (part) => {
    const damage = partDamage[part] || 0;
    return {
      fill: getColorForDamage(damage),
      stroke: selectedPart === part ? '#000' : '#555',
      strokeWidth: selectedPart === part ? 2 : 1,
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    };
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <h2 className="text-xl font-bold">Vehicle Damage Assessment</h2>
        <div className="flex items-center mt-2">
          <div className="h-2.5 w-full bg-gray-200 rounded-full mr-2">
            <div 
              className="h-2.5 rounded-full bg-red-500" 
              style={{ width: `${totalDamage}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{totalDamage}% Damaged</span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col lg:flex-row">
          {/* Vehicle diagram */}
          <div className="lg:w-3/5 h-[480px] border rounded-lg bg-gray-50 p-4">
            <svg viewBox="0 0 480 600" className="w-full h-full">
              {/* Car outline - top-down view like in BeamNG */}
              <path 
                d="M140,100 C140,100 180,80 240,80 C300,80 340,100 340,100 L360,130 C360,130 380,180 380,240 C380,300 380,400 380,480 C380,520 360,540 340,540 C300,540 180,540 140,540 C120,540 100,520 100,480 C100,400 100,300 100,240 C100,180 120,130 140,100 Z" 
                fill="none" 
                stroke="#aaa" 
                strokeWidth="2"
              />
              
              {/* Road */}
              <rect x="70" y="580" width="340" height="20" fill="#777" />
              <line x1="80" y1="590" x2="120" y2="590" stroke="#fff" strokeWidth="2" strokeDasharray="10,10" />
              <line x1="160" y1="590" x2="200" y2="590" stroke="#fff" strokeWidth="2" strokeDasharray="10,10" />
              <line x1="240" y1="590" x2="280" y2="590" stroke="#fff" strokeWidth="2" strokeDasharray="10,10" />
              <line x1="320" y1="590" x2="360" y2="590" stroke="#fff" strokeWidth="2" strokeDasharray="10,10" />
              
              {/* Wheels - as solid circles for top-down view */}
              <rect x="110" y="180" width="40" height="80" rx="10" fill="#333" stroke="#000" />
              <rect x="330" y="180" width="40" height="80" rx="10" fill="#333" stroke="#000" />
              <rect x="110" y="420" width="40" height="80" rx="10" fill="#333" stroke="#000" />
              <rect x="330" y="420" width="40" height="80" rx="10" fill="#333" stroke="#000" />
              
              {/* Car body - parts with potential damage */}
              {Object.keys(vehicleParts).map(partKey => {
                const part = vehicleParts[partKey];
                return (
                  <g key={partKey} onClick={() => handlePartClick(partKey)}>
                    <rect
                      x={part.x - part.width/2}
                      y={part.y - part.height/2}
                      width={part.width}
                      height={part.height}
                      rx="3"
                      style={getPartStyle(partKey)}
                      className="hover:opacity-90"
                    />
                    <text
                      x={part.x}
                      y={part.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#333"
                      fontSize="8"
                      pointerEvents="none"
                      className="select-none"
                    >
                      {part.name}
                    </text>
                  </g>
                );
              })}
              
              {/* Add windows for visual appeal - top and bottom windows for top-down view */}
              <path 
                d="M190,220 L290,220 L270,280 L210,280 Z" 
                fill="#b7e1f7" 
                stroke="#999"
                pointerEvents="none"
              />
              <path 
                d="M190,350 L290,350 L270,410 L210,410 Z" 
                fill="#b7e1f7" 
                stroke="#999"
                pointerEvents="none"
              />
            </svg>
          </div>
          
          {/* Damage details panel */}
          <div className="lg:w-2/5 p-4 overflow-y-auto" style={{maxHeight: "480px"}}>
            <h3 className="text-lg font-semibold mb-4">Damage Report</h3>
            
            {selectedPart ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-lg">{vehicleParts[selectedPart]?.name}</h4>
                  <div 
                    className="w-5 h-5 rounded-full" 
                    style={{ backgroundColor: getColorForDamage(partDamage[selectedPart] || 0) }}
                  ></div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Damage Level:</span>
                    <span>{Math.round((partDamage[selectedPart] || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${Math.round((partDamage[selectedPart] || 0) * 100)}%`,
                        backgroundColor: getColorForDamage(partDamage[selectedPart] || 0) 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-sm space-y-2">
                  <p className="font-medium">Diagnostic:</p>
                  <p className="text-gray-700">
                    {partDamage[selectedPart] > 0.75 ? (
                      "Critical damage. Immediate replacement required. Vehicle safety is compromised."
                    ) : partDamage[selectedPart] > 0.5 ? (
                      "Severe damage. Part needs urgent attention and likely replacement."
                    ) : partDamage[selectedPart] > 0.25 ? (
                      "Moderate damage. Performance may be affected. Repair recommended."
                    ) : partDamage[selectedPart] > 0 ? (
                      "Minor damage. Mostly cosmetic issues. Monitor for changes."
                    ) : (
                      "No damage detected. Part is in good working condition."
                    )}
                  </p>
                  
                  <p className="font-medium mt-3">Performance Impact:</p>
                  <p className="text-gray-700">
                    {selectedPart === 'engine' && partDamage[selectedPart] > 0.5 ? (
                      "Significant power loss. Engine may stall or overheat."
                    ) : selectedPart === 'steering' && partDamage[selectedPart] > 0.4 ? (
                      "Compromised steering response. Vehicle may pull to one side."
                    ) : selectedPart === 'suspension_front' && partDamage[selectedPart] > 0.3 ? (
                      "Reduced handling precision. Increased body roll in corners."
                    ) : selectedPart.includes('wheel') && partDamage[selectedPart] > 0.2 ? (
                      "Decreased traction and stability. Braking distance increased."
                    ) : partDamage[selectedPart] > 0.7 ? (
                      "Critical performance degradation. Use extreme caution."
                    ) : partDamage[selectedPart] > 0.4 ? (
                      "Noticeable performance impacts. Driving dynamics affected."
                    ) : partDamage[selectedPart] > 0.1 ? (
                      "Minor performance effects. May notice subtle differences."
                    ) : (
                      "No performance impact. Vehicle operates normally."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-lg text-blue-700">
                <p className="font-medium mb-2">Select a vehicle part to see detailed damage information</p>
                <p className="text-sm">Click on any colored part of the vehicle diagram to see its damage assessment.</p>
              </div>
            )}
            
            {/* Damage legend */}
            <div className="mt-6">
              <h4 className="font-medium mb-2 text-gray-700">Damage Color Legend</h4>
              <div className="grid grid-cols-5 gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: '#e0e0e0' }}></div>
                  <span className="text-xs text-gray-500">None</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: '#ffeb3b' }}></div>
                  <span className="text-xs text-gray-500">Minor</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: '#ff9800' }}></div>
                  <span className="text-xs text-gray-500">Moderate</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: '#ff5722' }}></div>
                  <span className="text-xs text-gray-500">Severe</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: '#f44336' }}></div>
                  <span className="text-xs text-gray-500">Critical</span>
                </div>
              </div>
            </div>
            
            {/* Damage summary stats */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-gray-700">Vehicle Health Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Most Damaged:</p>
                  <p className="font-medium">
                    {Object.entries(partDamage)
                      .sort((a, b) => b[1] - a[1])
                      .filter(([_key, value]) => value > 0)
                      .slice(0, 1)
                      .map(([key, value]) => 
                        `${vehicleParts[key]?.name || key} (${Math.round(value * 100)}%)`
                      )[0] || "No damage detected"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Damaged Parts:</p>
                  <p className="font-medium">
                    {Object.values(partDamage).filter(value => value > 0).length || 0}
                  </p>
                </div>
              </div>
              {/* Section to display the list of damaged parts */}
              <div className="mt-3 border-t pt-3">
                <p className="text-gray-500 mb-2">Damaged Parts List:</p>
                <ul className="text-sm space-y-1">
                  {Object.entries(partDamage)
                    .filter(([_key, value]) => value > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, value]) => (
                      <li key={key} className="flex justify-between">
                        <span>{vehicleParts[key]?.name || key}</span>
                        <span className="font-medium" style={{ color: getColorForDamage(value) }}>
                          {Math.round(value * 100)}%
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default VehicleDamageVisualization;