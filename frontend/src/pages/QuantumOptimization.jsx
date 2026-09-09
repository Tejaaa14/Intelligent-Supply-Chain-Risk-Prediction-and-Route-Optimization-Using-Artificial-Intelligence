import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Compass, Cpu, Settings, Activity, Clock, Target, PlayCircle, Layers, CheckCircle, GitCommit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const QuantumOptimization = () => {
  const [status, setStatus] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [vessels, setVessels] = useState([]);
  const [demoShipment, setDemoShipment] = useState({
    shipment_id: "VESSEL_001",
    origin: "Shanghai",
    destination: "Singapore",
    vessel_speed: 18.5,
    fuel_price: 640.0
  });

  useEffect(() => {
    fetchQuantumStatus();
    import('../services/api').then(m => m.getVessels().then(setVessels).catch(() => {}));
  }, []);

  const handleVesselChange = (e) => {
    const vId = e.target.value;
    const selectedVessel = vessels.find(v => v.vessel_id === vId);
    if (selectedVessel) {
      setDemoShipment({
        shipment_id: selectedVessel.vessel_id,
        origin: 'Shanghai', // default origin
        destination: selectedVessel.destination || 'Singapore',
        vessel_speed: selectedVessel.speed || 18.5,
        fuel_price: 640.0
      });
    }
  };

  const fetchQuantumStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/quantum/status');
      setStatus(res.data);
    } catch (err) {
      setError('Quantum backend unreachable.');
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setJobId(null);
    
    try {
      const res = await axios.post('http://localhost:8000/api/quantum/optimize', demoShipment);
      if (res.data && res.data.job_id) {
        setJobId(res.data.job_id);
        pollResults(res.data.job_id);
      }
    } catch (err) {
      setError('Failed to start quantum optimization.');
      setLoading(false);
    }
  };

  const pollResults = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/quantum/results/${id}`);
      if (res.data.status === 'COMPLETED') {
        setResults(res.data);
        setLoading(false);
      } else if (res.data.status === 'FAILED') {
        setError('Quantum job failed.');
        setLoading(false);
      } else {
        setTimeout(() => pollResults(id), 1000);
      }
    } catch (err) {
      setError('Error polling results.');
      setLoading(false);
    }
  };

  const renderStatusPanel = () => (
    <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="#00d2ff" /> QAOA Quantum Simulator Status
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            {status ? status.message : 'Initializing...'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: 'bold',
            background: status?.status === 'READY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: status?.status === 'READY' ? '#10b981' : '#ef4444'
          }}>
            {status ? status.status : 'OFFLINE'}
          </span>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Backend: {status?.backend || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Settings size={16} /> Optimization Parameters
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.85rem' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Target Vessel</div>
          <select 
            value={demoShipment.shipment_id}
            onChange={handleVesselChange}
            style={{ width: '100%', padding: '6px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
          >
            {vessels.map(v => (
              <option key={v.vessel_id} value={v.vessel_id}>{v.vessel_name}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Origin</div>
          <div style={{ fontWeight: '500' }}>{demoShipment.origin}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Destination</div>
          <div style={{ fontWeight: '500' }}>{demoShipment.destination}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Algorithm</div>
          <div style={{ fontWeight: '500', color: '#00d2ff' }}>QAOA (Qiskit Aer)</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Optimizer</div>
          <div style={{ fontWeight: '500' }}>COBYLA</div>
        </div>
      </div>
      <button 
        onClick={runOptimization}
        disabled={loading || !status || status.status !== 'READY'}
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #00d2ff, #3a86ff)',
          color: 'white',
          fontWeight: 'bold',
          cursor: (loading || !status || status.status !== 'READY') ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          opacity: (loading || !status || status.status !== 'READY') ? 0.7 : 1
        }}
      >
        {loading ? <Activity className="animate-spin" size={18} /> : <PlayCircle size={18} />}
        {loading ? 'Simulating QAOA Circuit...' : 'Run Quantum Route Optimization'}
      </button>
    </div>
  );

  const renderComparison = () => {
    if (!results || !results.classical_comparison) return null;
    const comp = results.classical_comparison;
    
    return (
      <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 210, 255, 0.3)', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#00d2ff' }}>
          <Target size={18} /> Classical vs Quantum Benchmark
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>Algorithm</th>
              <th style={{ padding: '12px 8px' }}>Selected Route</th>
              <th style={{ padding: '12px 8px' }}>Objective Score</th>
              <th style={{ padding: '12px 8px' }}>Execution Time</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '500' }}>Dijkstra (Classical)</td>
              <td style={{ padding: '12px 8px' }}>{comp.best_route_classical}</td>
              <td style={{ padding: '12px 8px' }}>{comp.objective_score.classical.toFixed(2)}</td>
              <td style={{ padding: '12px 8px' }}>{comp.execution_time_ms.classical.toFixed(2)} ms</td>
            </tr>
            <tr style={{ background: 'rgba(0, 210, 255, 0.05)' }}>
              <td style={{ padding: '12px 8px', fontWeight: '500', color: '#00d2ff' }}>QAOA (Quantum Sim)</td>
              <td style={{ padding: '12px 8px', color: '#00d2ff' }}>{comp.best_route_quantum}</td>
              <td style={{ padding: '12px 8px' }}>{comp.objective_score.quantum.toFixed(2)}</td>
              <td style={{ padding: '12px 8px' }}>{comp.execution_time_ms.quantum.toFixed(2)} ms</td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '0.85rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} /> Qubits Used: <span style={{ color: '#fff', fontWeight: 'bold' }}>{comp.qubits_used}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitCommit size={14} /> Circuit Depth: <span style={{ color: '#fff', fontWeight: 'bold' }}>{comp.circuit_depth}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMeasurements = () => {
    if (!results || !results.quantum_result || !results.quantum_result.measurements) return null;
    const measurements = results.quantum_result.measurements;
    
    return (
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '16px' }}>Measurement Probability Distribution</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={measurements} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="bitstring" stroke="#64748b" fontSize={12} angle={-45} textAnchor="end" interval={0} height={60} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '8px' }}
                itemStyle={{ color: '#00d2ff' }}
                formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Probability']}
              />
              <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                {measurements.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#00d2ff' : '#475569'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
          Bitstring |x⟩ representation of candidate routes.
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
      {/* Left Column: Config & Status */}
      <div>
        {renderStatusPanel()}
        {renderConfiguration()}
        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
      </div>
      
      {/* Right Column: Results & Viz */}
      <div>
        {!results && !loading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
            <Cpu size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Configure and run the QAOA simulation to view results.</p>
          </div>
        )}
        
        {loading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00d2ff' }}>
            <Activity size={48} className="animate-spin" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Executing QAOA Circuit...</h3>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>Simulating quantum optimization over dynamic route graph.</p>
          </div>
        )}

        {results && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <CheckCircle size={24} color="#10b981" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Optimization Complete</h2>
            </div>
            {renderComparison()}
            {renderMeasurements()}
          </>
        )}
      </div>
    </div>
  );
};

export default QuantumOptimization;
