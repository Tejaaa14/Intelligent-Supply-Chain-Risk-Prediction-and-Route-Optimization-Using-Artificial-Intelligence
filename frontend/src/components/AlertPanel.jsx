import React from 'react';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

const AlertPanel = ({ alerts = [], onRerouteClick }) => {
  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="#f43f5e" /> Active Disruption Alerts
        </h3>
        <span style={{ fontSize: '0.8rem', color: '#f43f5e', background: 'rgba(244,63,94,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
          {alerts.length} Pending
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alt) => {
          const isCritical = alt.severity === 'CRITICAL' || alt.severity === 'HIGH';

          return (
            <div
              key={alt.alert_id}
              style={{
                background: isCritical ? 'rgba(244, 63, 94, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${isCritical ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className={`badge badge-risk-${alt.severity?.toLowerCase() || 'high'}`}>{alt.severity}</span>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{alt.title}</strong>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '4px 0 6px 0' }}>
                  {alt.description}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                  Recommended Action: {alt.recommended_action}
                </div>
              </div>

              {isCritical && (
                <button
                  onClick={() => onRerouteClick && onRerouteClick(alt)}
                  style={{
                    background: '#f43f5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  Reroute Vessel <ArrowRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertPanel;
