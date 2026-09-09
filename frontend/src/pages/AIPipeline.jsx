import React, { useState } from 'react';
import { runWhatIfScenario } from '../services/api';
import { GitCommit, Database, Cpu, Activity, Compass, DollarSign, Target, Settings, Play } from 'lucide-react';

const AIPipeline = () => {
  const [params, setParams] = useState({
    weather_risk: 50,
    port_occupancy: 70,
    fuel_price: 600,
    geopolitical_risk: 30
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulationError, setSimulationError] = useState('');

  const handleSimulate = async () => {
    setLoading(true);
    setSimulationError('');
    try {
      const res = await runWhatIfScenario(params);
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
      setSimulationError(
        err?.response?.data?.detail ||
        err?.message ||
        'Simulation failed. The backend API may be unreachable or returned an error.'
      );
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Data Sources', icon: Database, desc: 'Live Open-Meteo, GDELT, AISStream, PortWatch' },
    { title: 'Feature Engineering', icon: Settings, desc: 'Distance, speed, weather risk, congestion, sentiment' },
    { title: 'Risk Classification', icon: ShieldAlertMock, desc: 'RandomForestClassifier (sklearn) - Low/Med/High/Critical' },
    { title: 'Delay Regression', icon: Activity, desc: 'XGBoostRegressor - Predicted hours of delay' },
    { title: 'Cost Estimation', icon: DollarSign, desc: 'Physics-based ops + penalty formula' },
    { title: 'Route Optimization', icon: Compass, desc: 'NetworkX Graph Dijkstra (weighted multi-criteria)' },
    { title: 'XAI (Explainability)', icon: Cpu, desc: 'SHAP TreeExplainer feature contribution' },
    { title: 'Recommendation', icon: Target, desc: 'Best route + alert generation' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitCommit color="#8b5cf6" size={24} /> AI Pipeline Architecture
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
          End-to-end data flow from live sources to ML models and route optimization engine.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, left: 16, background: '#8b5cf6', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {idx + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '10px' }}>
                  <Icon size={20} color="#8b5cf6" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{step.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{step.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={20} color="#34d399" /> What-If Scenario Simulation
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
          Adjust the sliders below to run the actual Random Forest and XGBoost models in real-time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px' }}>
                <span>Weather Severity (%)</span>
                <strong>{params.weather_risk}</strong>
              </div>
              <input type="range" min="0" max="100" value={params.weather_risk} onChange={e => setParams({...params, weather_risk: Number(e.target.value)})} style={{ width: '100%', accentColor: '#3a86ff' }} />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px' }}>
                <span>Port Congestion (%)</span>
                <strong>{params.port_occupancy}</strong>
              </div>
              <input type="range" min="0" max="100" value={params.port_occupancy} onChange={e => setParams({...params, port_occupancy: Number(e.target.value)})} style={{ width: '100%', accentColor: '#f59e0b' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px' }}>
                <span>Fuel Price ($/MT)</span>
                <strong>{params.fuel_price}</strong>
              </div>
              <input type="range" min="300" max="1200" step="10" value={params.fuel_price} onChange={e => setParams({...params, fuel_price: Number(e.target.value)})} style={{ width: '100%', accentColor: '#10b981' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px' }}>
                <span>Geopolitical Risk (%)</span>
                <strong>{params.geopolitical_risk}</strong>
              </div>
              <input type="range" min="0" max="100" value={params.geopolitical_risk} onChange={e => setParams({...params, geopolitical_risk: Number(e.target.value)})} style={{ width: '100%', accentColor: '#f43f5e' }} />
            </div>

            <button 
              onClick={handleSimulate}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '16px' }}>Simulation Results</h4>
            {simulationError && (
              <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', padding: '12px 16px', borderRadius: '8px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '16px' }}>
                ⚠ {simulationError}
              </div>
            )}
            {simulationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Risk Level:</span>
                  <span className={`badge badge-risk-${simulationResult.risk_level.toLowerCase()}`}>{simulationResult.risk_level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Predicted Delay:</span>
                  <strong style={{ color: '#f59e0b' }}>{simulationResult.predicted_delay_hours} hours</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Estimated Total Cost:</span>
                  <strong style={{ color: '#10b981' }}>${simulationResult.total_cost.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Model Confidence:</span>
                  <strong style={{ color: '#34d399' }}>{simulationResult.confidence}%</strong>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Run the simulation to see real-time model outputs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock icon for ShieldAlert to avoid adding it to lucide-react import
const ShieldAlertMock = ({ size, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="M12 8v4"></path>
    <path d="M12 16h.01"></path>
  </svg>
);

export default AIPipeline;
