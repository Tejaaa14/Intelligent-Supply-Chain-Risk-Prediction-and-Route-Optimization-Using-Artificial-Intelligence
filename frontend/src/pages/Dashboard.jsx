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
  getExplanation
} from '../services/api';
import { Ship, AlertTriangle, Clock, Activity, Database, RefreshCw } from 'lucide-react';

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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setRefreshStatus('Refreshing...');
      const [sumRes, vslRes, prtRes, riskRes, expRes, altRes, networkRes, weatherRes, healthRes, eventsRes] = await Promise.all([
        getDashboardSummary(),
        getVessels(),
        getPorts(),
        getRiskPrediction('SHIP_001'),
        getExplanation('SHIP_001'),
        getAlerts(),
        getGlobalRouteNetwork().catch(() => ({ routes: [] })),
        import('../services/api').then(m => m.getWeatherForVessel('VESSEL_001')).catch(() => null),
        import('../services/api').then(m => m.getSystemHealth()).catch(() => null),
        getGeopoliticalNews().catch(() => [])
      ]);

      setSummary(sumRes);
      setVessels(vslRes);
      setPorts(prtRes);
      setRiskData(riskRes);
      setExplanation(expRes);
      setAlerts(altRes);
      setRouteOptions(networkRes.routes || []);
      setSystemHealth(healthRes);
      setEvents(eventsRes || []);

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
        setWeatherZones([{ lat: 18.5, lon: 115.2, radius: 45, color: '#f43f5e', title: 'Typhoon Gaemi Warning (Fallback)', wind: '45 kts', wave: '5.8m' }]);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setRefreshStatus('Error');
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshStatus(''), 3000);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);



  // Dynamic Calculations — prefer backend summary values, fallback to local
  const activeVesselsCount = summary?.total_active_vessels ?? vessels.length;
  const pendingAlerts = summary?.active_alerts ?? alerts.filter(a => !a.is_resolved).length;
  // Fallback to alerts if shipments risk is not individually fetched for all
  const highRiskCount = summary?.high_risk_shipments ?? alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH' || a.alert_type === 'HIGH_RISK').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Data Source Mode Indicators */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700 }}>Decision Intelligence Overview</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Real-time Maritime Disruption Monitoring & Optimization</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {systemHealth && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
              {Object.entries(systemHealth).map(([sys, status]) => (
                <span key={sys} style={{ color: status === 'OK' || status === 'LIVE' ? '#10b981' : (status === 'FALLBACK' || status === 'SIMULATED' ? '#f59e0b' : '#f43f5e'), border: '1px solid currentColor', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {sys}: {status}
                </span>
              ))}
            </div>
          )}
          <button onClick={() => setShowPipeline(!showPipeline)} style={{ background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.3)', color: '#00d2ff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
            {showPipeline ? 'Hide' : 'Show'} Data Pipeline Status
          </button>
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
                <div style={{ color: '#94a3b8' }}>Type: <span className={`badge badge-${info.type.toLowerCase().includes('live') ? 'live' : 'simulated'}`}>{info.type}</span></div>
                <div style={{ color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Uses: {info.used_for}</div>
              </div>
            ))}
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
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{summary?.predicted_delays_avg_hours || 11.4} hrs</div>
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

      {/* Main Global Map & Risk Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Global Maritime Risk & Route Map</h3>
            <span style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Live Telemetry & Overlay</span>
          </div>
          <div style={{ height: '440px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <Map vessels={vessels} ports={ports} routes={routeOptions} weatherZones={weatherZones} events={events} systemHealth={systemHealth} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RiskCard riskData={riskData} />
          <AlertPanel alerts={alerts} onRerouteClick={() => onNavigateToRoute && onNavigateToRoute('route-optimization')} />
        </div>
      </div>

      {/* XAI Explanation Section */}
      <ExplanationPanel explanationData={explanation} />
    </div>
  );
};

export default Dashboard;
