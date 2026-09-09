import React, { useState, useEffect } from 'react';
import VesselTable from '../components/VesselTable';
import Map from '../components/Map';
import { getVessels, getVesselDetails, getWeatherForVessel } from '../services/api';
import { Ship, Navigation, Wind, Eye, Compass, Anchor } from 'lucide-react';

const Vessels = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedId, setSelectedId] = useState('VESSEL_001');
  const [vesselDetail, setVesselDetail] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const vList = await getVessels();
        setVessels(vList);
        if (vList.length > 0 && !selectedId) {
          setSelectedId(vList[0].vessel_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchVessels();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [det, w] = await Promise.all([
          getVesselDetails(selectedId),
          getWeatherForVessel(selectedId)
        ]);
        setVesselDetail(det);
        setWeather(w);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [selectedId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Ship color="#00d2ff" size={24} /> Vessel Tracking & Spatial Telemetry
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Real-time AIS Telemetry & Dynamic Position History</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Left Side: Selected Vessel Detailed Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#00d2ff' }}>{vesselDetail?.vessel_name || 'Ocean Star'}</h3>
              <span className={`badge badge-${vesselDetail?.data_source_mode?.toLowerCase() || 'simulated'}`}>
                {vesselDetail?.data_source_mode || 'SIMULATED'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>IMO Number</div>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{vesselDetail?.imo_number}</div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Speed / Course</div>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{vesselDetail?.speed ?? 'N/A'} kts | {vesselDetail?.heading ?? 'N/A'}&deg;</div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Current Coordinates</div>
                <div style={{ fontWeight: 600, color: '#34d399' }}>
                  {vesselDetail?.latitude != null ? vesselDetail.latitude.toFixed(4) : 'N/A'}&deg;N, {vesselDetail?.longitude != null ? vesselDetail.longitude.toFixed(4) : 'N/A'}&deg;E
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Destination</div>
                <div style={{ fontWeight: 600, color: '#00d2ff' }}>{vesselDetail?.destination}</div>
              </div>
            </div>
          </div>

          {/* Surrounding Weather Conditions */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.0rem', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wind size={18} color="#34d399" /> Surrounding Weather Conditions
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Wind Speed:</span> <strong>{weather?.wind_speed} knots</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Wave Height:</span> <strong>{weather?.wave_height} meters</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Visibility:</span> <strong>{weather?.visibility} km</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Condition:</span> <strong style={{ color: weather?.weather_risk_score > 50 ? '#f43f5e' : '#34d399' }}>{weather?.storm_condition}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Map showing selected vessel path */}
        <div className="glass-card" style={{ padding: '16px', height: '520px' }}>
          <Map vessels={vesselDetail ? [vesselDetail] : vessels} />
        </div>
      </div>

      <VesselTable vessels={vessels} selectedVesselId={selectedId} onSelectVessel={setSelectedId} />
    </div>
  );
};

export default Vessels;
