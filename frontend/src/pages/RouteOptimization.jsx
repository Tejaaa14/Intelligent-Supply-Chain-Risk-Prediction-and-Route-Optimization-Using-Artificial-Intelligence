import React, { useState, useEffect } from 'react';
import RouteComparison from '../components/RouteComparison';
import ExplanationPanel from '../components/ExplanationPanel';
import Map from '../components/Map';
import { optimizeRoutes, getExplanation, getVessels, getPorts, acceptRoute } from '../services/api';
import { Compass, Sliders, Play, CheckCircle, AlertTriangle } from 'lucide-react';

const RouteOptimization = ({ globalVesselId, setGlobalVesselId }) => {
  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Singapore');
  const [vesselId, setVesselId] = useState(globalVesselId || 'VESSEL_001');
  const [routes, setRoutes] = useState([]);
  const [recommendedId, setRecommendedId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [explanation, setExplanation] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [ports, setPorts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Weights state
  const [wRisk, setWRisk] = useState(0.25);
  const [wCost, setWCost] = useState(0.25);
  const [wDelay, setWDelay] = useState(0.20);

  useEffect(() => {
    if (globalVesselId && globalVesselId !== vesselId) {
      setVesselId(globalVesselId);
      // Update destination if possible
      const selectedVessel = vessels.find(v => v.vessel_id === globalVesselId);
      if (selectedVessel && selectedVessel.destination) setDestination(selectedVessel.destination);
    }
  }, [globalVesselId, vessels]);

  const handleVesselChange = (e) => {
    const vId = e.target.value;
    setVesselId(vId);
    if (setGlobalVesselId) setGlobalVesselId(vId);
    const selectedVessel = vessels.find(v => v.vessel_id === vId);
    if (selectedVessel) {
      if (selectedVessel.destination && selectedVessel.destination !== 'N/A') setDestination(selectedVessel.destination);
      if (selectedVessel.origin && selectedVessel.origin !== 'N/A') setOrigin(selectedVessel.origin);
    }
  };

  const runOptimization = async () => {
    try {
      setLoading(true);
      const rawWeights = {
          w_risk: wRisk,
          w_cost: wCost,
          w_delay: wDelay,
          w_dist: 0.15,
          w_time: 0.15
        };
      // Normalize so weights always sum to 1.0
      const total = Object.values(rawWeights).reduce((s, v) => s + v, 0);
      const normalizedWeights = {};
      for (const [k, v] of Object.entries(rawWeights)) {
        normalizedWeights[k] = parseFloat((v / total).toFixed(4));
      }

      const res = await optimizeRoutes({
        origin,
        destination,
        vessel_id: vesselId,
        weights: normalizedWeights
      });

      setRoutes(res.candidate_routes || []);
      setRecommendedId(res.recommended_route);
      setSelectedRouteId(res.recommended_route);

      const xai = await getExplanation(vesselId);
      setExplanation(xai);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const [vList, pList] = await Promise.all([getVessels(), getPorts()]);
      setVessels(vList);
      setPorts(pList);
      // Fetch events for map overlay
      try {
        const { getGeopoliticalNews } = await import('../services/api');
        const evts = await getGeopoliticalNews();
        setEvents(evts || []);
      } catch (_) {}
      runOptimization();
    };
    init();
  }, []);

  // Compute the routes to pass to the map — highlight selected, show all
  const mapRoutes = routes.map(rt => ({
    ...rt,
    is_recommended: rt.route_id === selectedRouteId
  }));

  const handleSelectRoute = async (rt) => {
    try {
      setLoading(true);
      // Update visual selection immediately
      setSelectedRouteId(rt.route_id);
      setRecommendedId(rt.route_id);

      await acceptRoute({
        vessel_id: vesselId,
        route_id: rt.route_id,
        method: "Dijkstra (Classical)"
      });
      alert(`Route ${rt.route_name} successfully accepted and alerts resolved!`);
    } catch (err) {
      console.error(err);
      alert("Failed to accept route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Compass color="#10b981" size={24} /> Graph-based Dynamic Maritime Route Optimization
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Multi-Criteria Dijkstra Algorithm evaluating Risk, Delay, Cost & Weather Disruption</p>
      </div>

      {/* Input Controls Form Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#00d2ff" /> Optimization Configuration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Origin Port</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Destination Port</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Vessel</label>
            <select
              value={vesselId}
              onChange={handleVesselChange}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
            >
              {vessels.map(v => (
                <option key={v.vessel_id} value={v.vessel_id}>{v.vessel_name} ({v.vessel_id})</option>
              ))}
            </select>
          </div>

          <button
            onClick={runOptimization}
            style={{
              padding: '10px 18px',
              background: '#10b981',
              color: '#042f2e',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Play size={16} /> Run Route Optimization
          </button>
        </div>

        {/* Sliders for Dynamic Weighting */}
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>Risk Weight</span>
              <span>{(wRisk * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.05" max="0.6" step="0.05" value={wRisk} onChange={(e) => setWRisk(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#f43f5e' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>Cost Weight</span>
              <span>{(wCost * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.05" max="0.6" step="0.05" value={wCost} onChange={(e) => setWCost(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#00d2ff' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>Delay Weight</span>
              <span>{(wDelay * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.05" max="0.6" step="0.05" value={wDelay} onChange={(e) => setWDelay(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#f59e0b' }} />
          </div>
        </div>
      </div>

      {/* Map visualization of candidate paths */}
      <div className="glass-card" style={{ padding: '16px', height: '420px' }}>
        <Map vessels={vessels} ports={ports} routes={mapRoutes} events={events} selectedVesselId={vesselId} />
      </div>

      {/* Route Candidate Cards Grid */}
      <RouteComparison routes={routes} recommendedRouteId={recommendedId} onSelectRoute={handleSelectRoute} />

      {/* XAI Explanation Panel */}
      <ExplanationPanel explanationData={explanation} />
    </div>
  );
};

export default RouteOptimization;
