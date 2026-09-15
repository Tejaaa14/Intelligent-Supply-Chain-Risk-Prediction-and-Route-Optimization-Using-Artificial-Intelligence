import React, { useState, useEffect } from 'react';
import Map from '../components/Map';
import RiskCard from '../components/RiskCard';
import AlertPanel from '../components/AlertPanel';
import ExplanationPanel from '../components/ExplanationPanel';
import ScenarioControlPanel from '../components/ScenarioControlPanel';
import {
  getDashboardSummary,
  getVessels,
  getPorts,
  getRiskPrediction,
  getAlerts,
  optimizeRoutes,
  getGeopoliticalNews,
  getGlobalRouteNetwork,
  getExplanation,
  getQuantumStatus,
  getSystemHealth,
  getWeatherForVessel
} from '../services/api';
import { Ship, AlertTriangle, Clock, Activity, Database, RefreshCw, Cpu, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';

const Dashboard = ({ onNavigateToRoute }) => {
  const [summary, setSummary] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [ports, setPorts] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weatherZones, setWeatherZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [quantumStatus, setQuantumStatus] = useState(null);
  const [aiSummaryVessel, setAiSummaryVessel] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setRefreshStatus('Refreshing...');
      const [sumRes, vslRes, prtRes, altRes, networkRes, healthRes, eventsRes, qStatusRes] = await Promise.all([
        getDashboardSummary(),
        getVessels(),
        getPorts(),
        getAlerts(),
        getGlobalRouteNetwork().catch(() => ({ routes: [] })),
        getSystemHealth().catch(() => null),
        getGeopoliticalNews().catch(() => []),
        getQuantumStatus().catch(() => null)
      ]);

      setSummary(sumRes);
      setVessels(vslRes);
      setPorts(prtRes);
      setAlerts(altRes);
      setRouteOptions(networkRes.routes || []);
      setSystemHealth(healthRes);
      setEvents(eventsRes || []);
      setQuantumStatus(qStatusRes);

      // Determine vessel for dynamic AI Risk / Explanation fetching
      const activeAlertsList = (altRes || []).filter(a => !a.is_resolved);
      let targetVesselId = 'SHIP_001';
      if (activeAlertsList.length > 0 && activeAlertsList[0].vessel_id) {
        targetVesselId = activeAlertsList[0].vessel_id;
      } else if (vslRes && vslRes.length > 0) {
        targetVesselId = vslRes[0].shipment_id || vslRes[0].id || 'SHIP_001';
      }
      setAiSummaryVessel(targetVesselId);

      const [riskRes, expRes, weatherRes] = await Promise.all([
        getRiskPrediction(targetVesselId).catch(() => null),
        getExplanation(targetVesselId).catch(() => null),
        getWeatherForVessel(targetVesselId).catch(() => null)
      ]);

      setRiskData(riskRes);
      setExplanation(expRes);

      if (weatherRes && weatherRes.latitude) {
        setWeatherZones([{
          lat: weatherRes.latitude,
          lon: weatherRes.longitude,
          radius: 45,
          color: weatherRes.current_wind_speed_knots > 30 ? '#f43f5e' : '#f59e0b',
          title: `Live Weather Zone (${weatherRes.source || 'Open-Meteo'})`,
          wind: `${weatherRes.current_wind_speed_knots} kts`,
          wave: `${weatherRes.wave_height_meters || 0}m`
        }]);
      } else {
        setWeatherZones([]);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setRefreshStatus('Error');
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshStatus(''), 2000);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);



  // Dynamic Calculations — using backend summary values
  const activeVesselsCount = summary?.total_active_vessels ?? vessels.length;
  const pendingAlertsList = alerts.filter(a => !a.is_resolved);
  const pendingAlerts = summary?.active_alerts ?? pendingAlertsList.length;
  const highRiskCount = summary?.high_risk_shipments ?? 0;
  const avgDelay = summary?.predicted_delays_avg_hours ?? 0;

  // AI Decision Summary logic
  const overallRiskLevel = highRiskCount > 0 ? (summary?.risk_summary?.CRITICAL > 0 ? 'CRITICAL' : 'HIGH') : 'MODERATE';
  const overallRiskColor = overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH' ? '#f43f5e' : (overallRiskLevel === 'MODERATE' ? '#f59e0b' : '#10b981');
  const topRiskFactor = explanation?.top_features?.[0]?.feature || 'Geopolitical Risk';
  const recommendedAction = pendingAlerts > 0 ? 'Reroute affected vessels through the lower-risk corridor.' : 'Continue monitoring live telemetry.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Data Source Mode Indicators */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700 }}>Decision Intelligence Overview</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Real-time Maritime Disruption Monitoring & Optimization</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button onClick={loadDashboardData} disabled={loading} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#00d2ff', padding: '6px 12px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', opacity: loading ? 0.6 : 1 }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {refreshStatus || 'Refresh'}
            </button>
            {summary?.last_updated && (
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                {refreshStatus ? 'Updating...' : `Updated just now`}
              </span>
            )}
          </div>
        </div>
      </div>

      {showPipeline && (
        <div className="glass-card" style={{ padding: '16px', marginTop: '-8px' }}>
          <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '12px' }}>Data Pipeline Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {summary?.data_sources_status && Object.entries(summary.data_sources_status).map(([src, info]) => (
              <div key={src} style={{ fontSize: '0.75rem', background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}>{src}</div>
                <div style={{ color: '#94a3b8' }}>Source: {info.source}</div>
                <div style={{ color: '#94a3b8' }}>Type: <span className={`badge badge-${info.type.toLowerCase().includes('live') || info.type === 'READY' ? 'live' : 'simulated'}`}>{info.type}</span></div>
                <div style={{ color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Uses: {info.used_for}</div>
              </div>
            ))}
            <div style={{ fontSize: '0.75rem', background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}>Quantum Optimizer</div>
              <div style={{ color: '#94a3b8' }}>Source: Qiskit QAOA Simulator</div>
              <div style={{ color: '#94a3b8' }}>Type: <span className="badge badge-live">{quantumStatus?.status || 'READY'}</span></div>
              <div style={{ color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Uses: Route Network Optimization</div>
            </div>
          </div>
        </div>
      )}

      <ScenarioControlPanel onScenarioChange={loadDashboardData} />

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" onClick={() => onNavigateToRoute && onNavigateToRoute('vessel-tracking')} style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ background: 'rgba(0, 210, 255, 0.15)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
            <Ship size={24} color="#00d2ff" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Vessels</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>{activeVesselsCount}</div>
          </div>
        </div>

        <div className="glass-card" onClick={() => onNavigateToRoute && onNavigateToRoute('risk-analysis')} style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <AlertTriangle size={24} color="#f43f5e" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>High Risk Shipments</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e' }}>{highRiskCount}</div>
          </div>
        </div>

        <div className="glass-card" onClick={() => onNavigateToRoute && onNavigateToRoute('risk-analysis')} style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Avg Predicted Delay</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{summary?.predicted_delays_avg_hours?.toFixed(1) ?? '—'} hrs</div>
          </div>
        </div>

        <div className="glass-card" onClick={() => onNavigateToRoute && onNavigateToRoute('vessel-tracking')} style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Activity size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Alerts</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{pendingAlerts}</div>
          </div>
        </div>
      </div>

      {/* Main Global Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Global Maritime Risk & Route Map</h3>
            <span style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Live Telemetry & Overlay</span>
          </div>
          <div style={{ height: '480px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <Map vessels={vessels} ports={ports} routes={routeOptions} weatherZones={weatherZones} events={events} systemHealth={systemHealth} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {/* Risk Prediction Model */}
        <RiskCard riskData={riskData} explanation={explanation} />
        {/* AI Decision Summary */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#00d2ff" /> AI Decision Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Risk</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: overallRiskColor }}>{overallRiskLevel}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Confidence</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#34d399' }}>{explanation?.confidence || riskData?.confidence || '—'}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Predicted Delay</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>{avgDelay} hrs</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Est. Cost Impact</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>${(avgDelay * 1200).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Primary Risk</div>
            <div style={{ fontSize: '0.9rem', color: '#f43f5e', marginBottom: '8px' }}>{topRiskFactor}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Recommendation</div>
            <div style={{ fontSize: '0.9rem', color: '#34d399' }}>{recommendedAction}</div>
          </div>
        </div>

        {/* Quantum Optimization Summary */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="#8b5cf6" /> Quantum Route Optimization
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</span>
            <span className={`badge badge-${quantumStatus?.status === 'READY' || quantumStatus?.status === 'COMPLETED' ? 'live' : 'simulated'}`}>
              {quantumStatus?.status || 'READY'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Method</div>
              <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>QAOA Simulation</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Priority Vessels</div>
              <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{quantumStatus ? Math.min(activeVesselsCount, 5) : 0}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Result</div>
            <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
              {quantumStatus?.status === 'COMPLETED' ? 'Optimization complete. Routes updated.' : 'No optimization run yet.'}
            </div>
          </div>
          <button 
            onClick={() => onNavigateToRoute && onNavigateToRoute('quantum-optimization')}
            style={{ width: '100%', marginTop: '16px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            View Quantum Optimizer
          </button>
        </div>
      </div>

      {/* XAI Explanation Section */}
      <ExplanationPanel explanationData={explanation} />
    </div>
  );
};

export default Dashboard;
