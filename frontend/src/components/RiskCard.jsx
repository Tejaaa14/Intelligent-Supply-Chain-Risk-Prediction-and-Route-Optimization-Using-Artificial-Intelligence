import React from 'react';
import { AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';

const RiskCard = ({ riskData }) => {
  if (!riskData) return null;

  const { risk_probability = 75, risk_level = 'HIGH', confidence = 89, feature_contributions = {} } = riskData;

  const getLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#e11d48';
      case 'HIGH': return '#f43f5e';
      case 'MEDIUM': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const color = getLevelColor(risk_level);

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color={color} />
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Disruption Risk Assessment</h3>
        </div>
        <span className={`badge badge-risk-${risk_level.toLowerCase()}`}>{risk_level} RISK</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
        {/* Risk Probability Gauge */}
        <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: color, fontFamily: 'Outfit, sans-serif' }}>
            {risk_probability}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em' }}>Risk Probability</div>
        </div>

        {/* Confidence Score */}
        <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#00d2ff', fontFamily: 'Outfit, sans-serif' }}>
            {confidence}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em' }}>Model Confidence</div>
        </div>
      </div>

      {/* Feature Contributions Breakdown Bars */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '10px' }}>Key Disruption Factors</div>
        
        {Object.entries(feature_contributions).map(([factor, percent]) => (
          <div key={factor} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
              <span style={{ textTransform: 'capitalize' }}>{factor.replace('_', ' ')}</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{percent}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${percent}%`,
                  background: factor === 'weather' ? '#f43f5e' : (factor === 'port_congestion' ? '#f59e0b' : '#3a86ff'),
                  borderRadius: '3px',
                  transition: 'width 0.6s ease'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskCard;
