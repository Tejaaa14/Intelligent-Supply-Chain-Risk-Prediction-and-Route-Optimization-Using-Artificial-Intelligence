import React from 'react';
import { BrainCircuit, Info, Check } from 'lucide-react';

const ExplanationPanel = ({ explanationData }) => {
  if (!explanationData) return null;

  const { natural_language_explanation, top_risk_drivers = [], confidence = 91 } = explanationData;

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={20} color="#00d2ff" /> Explainable AI (XAI) Recommendation Rationale
        </h3>
        <span style={{ fontSize: '0.8rem', background: 'rgba(0, 210, 255, 0.15)', color: '#00d2ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
          {confidence}% Confidence
        </span>
      </div>

      {/* Natural Language Rationale Box */}
      <div style={{ background: 'rgba(0, 210, 255, 0.06)', borderLeft: '4px solid #00d2ff', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.78rem', color: '#00d2ff', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
          Decision Intelligence Rationale
        </div>
        <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
          {natural_language_explanation}
        </p>
      </div>

      {/* SHAP Feature Importance List */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>
          SHAP Feature Impact Attribution:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {top_risk_drivers.map((driver, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{driver.factor}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: driver.impact_percentage > 25 ? '#f43f5e' : '#f59e0b' }}>
                +{driver.impact_percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;
