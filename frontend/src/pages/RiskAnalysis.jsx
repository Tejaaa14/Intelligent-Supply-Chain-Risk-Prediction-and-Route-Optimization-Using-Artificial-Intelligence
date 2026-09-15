import React, { useState, useEffect } from 'react';
import { getRiskPrediction, getDelayPrediction, getCostPrediction, getModelMetrics, getGeopoliticalNews, getVessels } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert, Cpu, AlertCircle, FileText, Clock, DollarSign, Database, Info } from 'lucide-react';

const RiskAnalysis = ({ globalVesselId, setGlobalVesselId }) => {
  const [riskData, setRiskData] = useState(null);
  const [delayData, setDelayData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(globalVesselId || '');
  const [metricsError, setMetricsError] = useState(false);

  // Fetch vessel list on mount
  useEffect(() => {
    getVessels()
      .then(vList => {
        setVessels(vList);
        if (vList.length > 0 && selectedVessel === '') {
          const defaultVessel = vList[0].vessel_id;
          setSelectedVessel(defaultVessel);
          if (setGlobalVesselId && !globalVesselId) setGlobalVesselId(defaultVessel);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (globalVesselId && globalVesselId !== selectedVessel) {
      setSelectedVessel(globalVesselId);
    }
  }, [globalVesselId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [r, d, c, m, n] = await Promise.all([
          getRiskPrediction(selectedVessel),
          getDelayPrediction(selectedVessel),
          getCostPrediction(selectedVessel),
          getModelMetrics().catch(() => { setMetricsError(true); return null; }),
          getGeopoliticalNews().catch(() => [])
        ]);
        setRiskData(r);
        setDelayData(d);
        setCostData(c);
        setMetrics(m);
        setNews(n || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load risk analysis data. Please check the backend connection.');
      } finally {
        setLoading(false);
      }
    };
    if (selectedVessel) {
      loadData();
    }
  }, [selectedVessel]);

  // Generate dynamic chart data from actual backend feature contributions
  const chartData = [];
  const colorMap = ['#f43f5e', '#f59e0b', '#8b5cf6', '#3a86ff', '#10b981'];
  if (riskData?.feature_contributions) {
      let idx = 0;
      for (const [key, val] of Object.entries(riskData.feature_contributions)) {
          chartData.push({
              name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: val,
              color: colorMap[idx % colorMap.length]
          });
          idx++;
      }
  } else {
    chartData.push(
        { name: 'Weather', value: 0, color: '#f43f5e' },
        { name: 'Port Congestion', value: 0, color: '#f59e0b' },
        { name: 'Geopolitical Risk', value: 0, color: '#8b5cf6' }
    );
  }

  const formatETA = (isoString) => {
    if (!isoString) return 'Unknown';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return isoString;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert color="#f43f5e" size={24} /> Supply Chain Risk & Disruption Prediction Analytics
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Multi-Factor AI Model Analysis & Academic Metric Verification</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Vessel/Shipment:</label>
          <select
            value={selectedVessel}
            onChange={(e) => {
              setSelectedVessel(e.target.value);
              if (setGlobalVesselId) setGlobalVesselId(e.target.value);
            }}
            style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
          >
            {vessels.map(v => (
              <option key={v.vessel_id} value={v.vessel_id}>
                {v.vessel_name} ({v.vessel_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', padding: '14px 18px', borderRadius: '10px', color: '#fb7185', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Loading risk analysis for {selectedVessel}...</div>
          <div style={{ fontSize: '0.8rem' }}>Fetching live data from integrated sources</div>
        </div>
      )}

      {!loading && !error && (
        <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* Risk Detail Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} color="#f43f5e" /> Risk Prediction Details</h3>
            <span className={`badge badge-risk-${riskData?.risk_level?.toLowerCase() || 'low'}`}>{riskData?.risk_level || 'UNKNOWN'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Shipment/Vessel:</span> <strong style={{ color: '#00d2ff' }}>{riskData?.vessel_name || 'Loading...'}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Prediction Timestamp:</span> <span style={{ color: '#cbd5e1' }}>{riskData?.prediction_timestamp ? new Date(riskData.prediction_timestamp).toLocaleString() : 'Loading...'}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Risk Probability:</span> <strong style={{ color: '#f43f5e', fontSize: '1rem' }}>{riskData?.risk_probability || 0}%</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>Model Confidence <Info size={12}/> :</span> 
                 <strong style={{ color: '#34d399' }}>{riskData?.confidence || 0}%</strong>
             </div>
             <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Model: {riskData?.model_name || 'Loading...'}</div>
          </div>
        </div>

        {/* Delay Detail Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} color="#f59e0b" /> Delay Prediction Details</h3>
            <span className="badge badge-simulated">{delayData?.predicted_delay_hours || 0} hrs delay</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Original ETA:</span> <span style={{ color: '#cbd5e1' }}>{formatETA(delayData?.original_eta)}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Predicted ETA:</span> <strong style={{ color: '#f59e0b' }}>{formatETA(delayData?.predicted_eta)}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Probability of Delay:</span> <strong style={{ color: '#f59e0b' }}>{delayData?.probability_of_delay || 0}%</strong></div>
             <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                 <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Main Delay Factors:</div>
                 <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1' }}>
                    {delayData?.main_delay_factors?.map((f, i) => (
                        <li key={i}>{f.factor} ({f.value} {f.unit})</li>
                    )) || <li>Loading...</li>}
                 </ul>
             </div>
             <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Model: {delayData?.model_name || 'Loading...'}</div>
          </div>
        </div>

        {/* Cost Detail Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign size={18} color="#10b981" /> Cost Prediction Details</h3>
            <strong style={{ color: '#10b981', fontSize: '1.2rem' }}>${costData?.total_estimated_cost?.toLocaleString() || 0}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Fuel Cost ({costData?.breakdown_percentages?.fuel || 0}%):</span> <span style={{ color: '#cbd5e1' }}>${costData?.fuel_cost?.toLocaleString() || 0}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Port Cost ({costData?.breakdown_percentages?.port || 0}%):</span> <span style={{ color: '#cbd5e1' }}>${costData?.port_cost?.toLocaleString() || 0}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Delay Penalty ({costData?.breakdown_percentages?.delay || 0}%):</span> <strong style={{ color: '#f43f5e' }}>${costData?.delay_cost?.toLocaleString() || 0}</strong></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Ops Overhead ({costData?.breakdown_percentages?.ops || 0}%):</span> <span style={{ color: '#cbd5e1' }}>${costData?.operational_cost?.toLocaleString() || 0}</span></div>
             <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                 <strong>Formula:</strong> {costData?.formula_explanation || 'Loading...'}
             </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '16px' }}>Dynamic Multi-Factor Risk Breakdown</h3>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NLP Geopolitical Disruption News */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#8b5cf6" /> Geopolitical NLP Disruption Stream
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
            {news.length > 0 ? news.slice(0, 4).map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>EVENT: {item.event_type}</span>
                  <span style={{ color: '#cbd5e1' }}>Location: {item.location}</span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>{item.headline}</div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', marginTop: '4px', color: '#94a3b8' }}>
                  <span>Sentiment: {item.sentiment}</span>
                  <span>Risk Score: <strong style={{ color: item.risk_score > 60 ? '#f43f5e' : '#34d399' }}>{item.risk_score}</strong></span>
                </div>
              </div>
            )) : (
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                No geopolitical disruption events detected. The GDELT feed may be temporarily unavailable.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Performance Evaluation Metrics Panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#00d2ff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} color="#00d2ff" /> Academic Model Performance Benchmarks
        </h3>

        {metricsError || !metrics || !metrics.risk_classification_model?.training_samples ? (
          <div style={{ color: '#f59e0b', fontSize: '0.85rem', padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
            Model not trained / Insufficient evaluation data. The model evaluation endpoint may be unavailable or the dataset is empty.
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
               <h4 style={{ fontSize: '0.95rem', color: '#34d399', margin: 0 }}>Risk Classification Model</h4>
               <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{metrics?.risk_classification_model?.model_name || 'RandomForest'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
               Dataset: {metrics?.risk_classification_model?.dataset || 'Awaiting data...'} <br/>
               Samples: {metrics?.risk_classification_model?.training_samples || '—'} Train / {metrics?.risk_classification_model?.testing_samples || '—'} Test
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginBottom: '16px' }}>
              <div>Accuracy: <strong>{metrics?.risk_classification_model?.accuracy || '—'}</strong></div>
              <div>F1-Score: <strong>{metrics?.risk_classification_model?.f1_score || '—'}</strong></div>
              <div>Precision: <strong>{metrics?.risk_classification_model?.precision || '—'}</strong></div>
              <div>Recall: <strong>{metrics?.risk_classification_model?.recall || '—'}</strong></div>
            </div>
            
            {metrics?.risk_classification_model?.confusion_matrix && (
                <div>
                   <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Confusion Matrix (Test Set):</div>
                   <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${metrics.risk_classification_model.confusion_matrix.length}, 1fr)`, gap: '2px', background: 'rgba(255,255,255,0.1)', padding: '2px', borderRadius: '4px' }}>
                       {metrics.risk_classification_model.confusion_matrix.map((row, i) => 
                           row.map((val, j) => (
                               <div key={`${i}-${j}`} style={{ background: i === j ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.1)', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', textAlign: 'center', minWidth: '30px' }}>
                                   {val}
                               </div>
                           ))
                       )}
                   </div>
                </div>
            )}
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
               <h4 style={{ fontSize: '0.95rem', color: '#60a5fa', margin: 0 }}>Delay Prediction Model</h4>
               <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{metrics?.delay_prediction_model?.model_name || 'XGBoost Regressor'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
               Dataset: {metrics?.delay_prediction_model?.dataset || 'Awaiting data...'} <br/>
               Samples: {metrics?.delay_prediction_model?.training_samples || '—'} Train / {metrics?.delay_prediction_model?.testing_samples || '—'} Test
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
              <div>MAE: <strong>{metrics?.delay_prediction_model?.mae || '—'} hrs</strong></div>
              <div>RMSE: <strong>{metrics?.delay_prediction_model?.rmse || '—'} hrs</strong></div>
              <div>R&sup2; Score: <strong>{metrics?.delay_prediction_model?.r2_score || '—'}</strong></div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
               <Database size={16} color="#60a5fa" />
               <span>The regression model was trained on historical tracking records to predict the total accumulated voyage delay based on weather, congestion, and geopolitical indicators.</span>
            </div>
          </div>
        </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default RiskAnalysis;
