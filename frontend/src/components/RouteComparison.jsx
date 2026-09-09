import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Clock, ShieldAlert } from 'lucide-react';

const RouteComparison = ({ routes = [], recommendedRouteId, onSelectRoute }) => {
  if (!routes || routes.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {routes.map((rt) => {
        const isRecommended = rt.route_id === recommendedRouteId || rt.is_recommended;

        return (
          <div
            key={rt.route_id}
            className="glass-card"
            style={{
              padding: '20px',
              position: 'relative',
              borderColor: isRecommended ? '#10b981' : (rt.risk_score > 60 ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'),
              background: isRecommended ? 'rgba(16, 185, 129, 0.08)' : 'rgba(18, 26, 42, 0.75)'
            }}
          >
            {isRecommended && (
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '16px',
                  background: '#10b981',
                  color: '#042f2e',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 size={12} /> RECOMMENDED ROUTE
              </div>
            )}

            <h4 style={{ fontSize: '1.05rem', color: isRecommended ? '#34d399' : '#f8fafc', marginBottom: '8px' }}>
              {rt.route_name}
            </h4>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{rt.origin}</span>
              <ArrowRight size={14} />
              <span>{rt.destination}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Risk Score</div>
                <div style={{ fontWeight: 700, color: rt.risk_score > 60 ? '#f43f5e' : (rt.risk_score > 35 ? '#f59e0b' : '#34d399') }}>
                  {rt.risk_score}%
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Predicted Delay</div>
                <div style={{ fontWeight: 700, color: rt.predicted_delay_hours > 10 ? '#f43f5e' : '#f8fafc' }}>
                  {rt.predicted_delay_hours} hrs
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Est. Total Cost</div>
                <div style={{ fontWeight: 700, color: '#00d2ff' }}>
                  ${rt.estimated_total_cost?.toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Safety Score</div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>
                  {rt.safety_score}%
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectRoute && onSelectRoute(rt)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: isRecommended ? '#10b981' : 'rgba(255,255,255,0.08)',
                color: isRecommended ? '#042f2e' : '#f8fafc',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isRecommended ? 'Selected Route' : 'Select Route'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RouteComparison;
