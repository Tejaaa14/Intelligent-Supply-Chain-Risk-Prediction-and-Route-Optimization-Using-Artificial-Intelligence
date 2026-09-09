import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Zap, XCircle, CloudRain, AlertCircle, Droplets } from 'lucide-react';

const ScenarioControlPanel = ({ onScenarioChange }) => {
  const [activeScenario, setActiveScenario] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentScenario();
  }, []);

  const fetchCurrentScenario = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/scenario/current');
      setActiveScenario(res.data);
    } catch (err) {
      console.error("Error fetching scenario", err);
    }
  };

  const scenarios = [
    {
      id: "TYPHOON_SCS",
      name: "Typhoon in South China Sea",
      icon: <CloudRain size={16} color="#3b82f6" />,
      params: { weather_bonus: 50.0, congestion_bonus: 10.0, geo_bonus: 0.0, fuel_price_bonus: 0.0 },
      description: "Severe weather injects extreme delays and risk along Asian routes."
    },
    {
      id: "SUEZ_BLOCKAGE",
      name: "Suez Canal Blockage",
      icon: <AlertCircle size={16} color="#f59e0b" />,
      params: { weather_bonus: 0.0, congestion_bonus: 80.0, geo_bonus: 20.0, fuel_price_bonus: 0.0 },
      description: "Simulates complete blockage, forcing routing around the Cape of Good Hope."
    },
    {
      id: "FUEL_SPIKE",
      name: "Sudden Fuel Price Spike",
      icon: <Droplets size={16} color="#ef4444" />,
      params: { weather_bonus: 0.0, congestion_bonus: 0.0, geo_bonus: 0.0, fuel_price_bonus: 300.0 },
      description: "Increases fuel costs by $300/ton globally, shifting optimal routes to shorter distances."
    }
  ];

  const applyScenario = async (scenario) => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/api/scenario/run', {
        name: scenario.name,
        ...scenario.params
      });
      await fetchCurrentScenario();
      if (onScenarioChange) onScenarioChange();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearScenario = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/api/scenario/clear');
      await fetchCurrentScenario();
      if (onScenarioChange) onScenarioChange();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#00d2ff" /> Digital Twin Scenario Simulator
        </h3>
        {activeScenario?.is_active && (
          <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={12} /> SCENARIO OVERRIDE ACTIVE
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {scenarios.map((s) => {
          const isActive = activeScenario?.active_scenario === s.name;
          return (
            <div 
              key={s.id} 
              style={{ 
                background: isActive ? 'rgba(0, 210, 255, 0.1)' : 'rgba(15, 23, 42, 0.5)', 
                border: `1px solid ${isActive ? '#00d2ff' : 'rgba(255,255,255,0.05)'}`, 
                padding: '12px', 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: isActive ? '#00d2ff' : '#e2e8f0', marginBottom: '4px' }}>
                  {s.icon} {s.name}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>{s.description}</p>
              </div>
              <button 
                onClick={() => applyScenario(s)}
                disabled={loading || isActive}
                style={{ 
                  marginTop: '12px', 
                  width: '100%', 
                  padding: '6px', 
                  background: isActive ? 'transparent' : 'rgba(255,255,255,0.05)', 
                  border: isActive ? '1px solid #00d2ff' : 'none', 
                  color: isActive ? '#00d2ff' : '#cbd5e1', 
                  borderRadius: '4px',
                  cursor: (loading || isActive) ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {isActive ? 'Active' : 'Apply Scenario'}
              </button>
            </div>
          );
        })}
      </div>

      {activeScenario?.is_active && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={clearScenario}
            disabled={loading}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(239, 68, 68, 0.15)', 
              color: '#ef4444', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              padding: '6px 16px', 
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            <XCircle size={14} /> Revert to Live Data Only
          </button>
        </div>
      )}
    </div>
  );
};

export default ScenarioControlPanel;
