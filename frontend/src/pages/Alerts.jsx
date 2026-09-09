import React, { useState, useEffect } from 'react';
import AlertPanel from '../components/AlertPanel';
import { getAlerts, optimizeRoutes, getAuditLogs } from '../services/api';
import { Bell, ShieldAlert, History, CheckCircle } from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [rerouted, setRerouted] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const altRes = await getAlerts();
        setAlerts(altRes);

        const logsRes = await getAuditLogs();
        setAuditLogs(logsRes);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlerts();
  }, []);

  const handleReroute = async (alertItem) => {
    try {
      const vesselId = alertItem.vessel_id || 'VESSEL_001';
      const res = await optimizeRoutes({
        origin: 'Shanghai',
        destination: 'Singapore',
        vessel_id: vesselId
      });

      // Log explicit reroute audit entry
      try {
        const api = (await import('../services/api')).default;
        await api.post('/audit', null, { params: {
          user: 'logistics_manager',
          action: 'REROUTE_FROM_ALERT',
          vessel_id: vesselId,
          details: `Rerouted via alert: ${alertItem.title || alertItem.alert_id}`
        }});
      } catch (_) { /* audit log is best-effort */ }

      setRerouted(true);

      const logsRes = await getAuditLogs();
      setAuditLogs(logsRes);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell color="#f43f5e" size={24} /> Alerts Center & Audit Decision Logs
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Real-time Risk Alerts, Decision Support & Audit Trail</p>
      </div>

      {rerouted && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', padding: '14px', borderRadius: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <CheckCircle size={20} />
          <strong>Reroute Executed Successfully!</strong> Ocean Star vessel trajectory updated to Route B (Lombok Bypass).
        </div>
      )}

      <AlertPanel alerts={alerts} onRerouteClick={handleReroute} />

      {/* Audit Log Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#00d2ff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#00d2ff" /> Decision Audit Logs
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                <th style={{ padding: '8px 12px' }}>Timestamp</th>
                <th style={{ padding: '8px 12px' }}>User</th>
                <th style={{ padding: '8px 12px' }}>Action</th>
                <th style={{ padding: '8px 12px' }}>Vessel ID</th>
                <th style={{ padding: '8px 12px' }}>Risk Score</th>
                <th style={{ padding: '8px 12px' }}>Recommended Route</th>
                <th style={{ padding: '8px 12px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>{log.user}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: 'rgba(0,210,255,0.15)', color: '#00d2ff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                      {log.request_action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{log.vessel_id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: log.risk_score > 60 ? '#f43f5e' : '#34d399' }}>{log.risk_score}%</td>
                  <td style={{ padding: '10px 12px', color: '#34d399' }}>{log.recommended_route}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#94a3b8' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
