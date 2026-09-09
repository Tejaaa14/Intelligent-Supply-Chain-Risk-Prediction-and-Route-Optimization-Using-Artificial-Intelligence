import React from 'react';
import { Navigation, Compass, MapPin, Clock } from 'lucide-react';

const VesselTable = ({ vessels = [], selectedVesselId, onSelectVessel }) => {
  const formatETA = (etaStr) => {
    if (!etaStr || etaStr === 'N/A') return <span style={{ color: '#94a3b8' }}>N/A</span>;
    
    let isEstimated = false;
    let dateStr = etaStr;
    
    if (etaStr.includes('|ESTIMATED')) {
      isEstimated = true;
      dateStr = etaStr.split('|')[0];
    }
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return <span style={{ color: '#94a3b8' }}>N/A</span>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#e2e8f0' }}>{d.toLocaleString()}</span>
        {isEstimated && <span style={{ fontSize: '0.65rem', color: '#f59e0b', textTransform: 'uppercase' }}>Estimated</span>}
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={18} color="#00d2ff" /> Active Vessels Tracking
        </h3>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Fleet: {vessels.length}</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
            <th style={{ padding: '10px 12px' }}>Vessel Name</th>
            <th style={{ padding: '10px 12px' }}>MMSI / IMO</th>
            <th style={{ padding: '10px 12px' }}>Location</th>
            <th style={{ padding: '10px 12px' }}>Speed / Head</th>
            <th style={{ padding: '10px 12px' }}>Destination</th>
            <th style={{ padding: '10px 12px' }}>ETA</th>
            <th style={{ padding: '10px 12px' }}>Status</th>
            <th style={{ padding: '10px 12px' }}>Data Source Mode</th>
          </tr>
        </thead>
        <tbody>
          {vessels.map((v) => {
            const isSelected = v.vessel_id === selectedVesselId;
            return (
              <tr
                key={v.vessel_id}
                onClick={() => onSelectVessel && onSelectVessel(v.vessel_id)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                <td style={{ padding: '12px', fontWeight: 600, color: isSelected ? '#00d2ff' : '#f8fafc' }}>
                  {v.vessel_name}
                </td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>
                  {v.mmsi || 'N/A'}<br/>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>IMO: {v.imo_number && v.imo_number !== 'N/A' ? v.imo_number : '--'}</span>
                </td>
                <td style={{ padding: '12px', color: '#cbd5e1' }}>
                  {v.latitude ? `${v.latitude.toFixed(3)}°, ${v.longitude.toFixed(3)}°` : 'N/A'}
                </td>
                <td style={{ padding: '12px', color: '#cbd5e1' }}>
                  {v.speed !== undefined && v.speed !== null ? Number(v.speed).toFixed(1) : 'N/A'} kts | {v.heading !== undefined && v.heading !== null ? Number(v.heading).toFixed(0) : 'N/A'}&deg;
                </td>
                <td style={{ padding: '12px', color: '#f8fafc', fontWeight: 500 }}>{v.destination && v.destination !== 'N/A' ? v.destination : <span style={{color: '#64748b'}}>Awaiting Route Info</span>}</td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>
                  {formatETA(v.eta)}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#34d399', borderRadius: '50%', marginRight: '6px' }}></span>
                    {v.navigation_status || v.status || 'UNKNOWN'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className={`badge badge-${v.data_source_mode?.toLowerCase() || 'simulated'}`}>
                      {v.data_source_mode || 'SIMULATION'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Src: {v.source || 'AISStream'}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VesselTable;
