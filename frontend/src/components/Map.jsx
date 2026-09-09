import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, GeoJSON, useMap, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import countryGeoJson from '../assets/countries.json';

// Fix default leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Markers
const createVesselIcon = (color = '#00d2ff') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="28" height="28" style="filter: drop-shadow(0 0 6px ${color});"><path d="M2 19.5c0 0 3-1 10-1s10 1 10 1v.5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-.5zm2-3.5h16l-1.5-6H5.5L4 16zm4-7.5V4h8v4.5h-8z"/></svg>`;
  return L.divIcon({ html: svg, className: 'custom-vessel-icon', iconSize: [28, 28], iconAnchor: [14, 14] });
};

const createEventIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="24" height="24" style="filter: drop-shadow(0 0 4px #f59e0b);"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
  return L.divIcon({ html: svg, className: 'custom-event-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
};

const MAP_THEMES = {
  'Dark Maritime': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ' },
  'Light Maritime': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ' },
  'Navigation': { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors' },
  'Satellite': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' },
  'Terrain': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS' }
};

const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

// Auto-fitter Component
const MapBoundsFitter = ({ vessels, ports, routes, events }) => {
  const map = useMap();
  useEffect(() => {
    // Fix tile rendering: invalidate size after layout settles
    setTimeout(() => map.invalidateSize(), 200);

    let points = [];
    if (vessels?.length) vessels.forEach(v => { if (v.latitude && v.longitude) points.push([v.latitude, v.longitude]); });
    if (ports?.length) ports.forEach(p => { if (p.latitude && p.longitude) points.push([p.latitude, p.longitude]); });
    if (events?.length) events.forEach(e => { if (e.latitude && e.longitude) points.push([e.latitude, e.longitude]); });
    if (routes?.length) routes.forEach(r => { if (r.waypoints) r.waypoints.forEach(wp => points.push([wp.lat, wp.lon])); });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [vessels, ports, routes, events, map]);
  return null;
};

const Map = ({ vessels = [], ports = [], routes = [], weatherZones = [], events = [], systemHealth = null }) => {
  const defaultCenter = [18.0, 115.0];
  const stableGeoJson = useMemo(() => countryGeoJson, []);

  const [theme, setTheme] = useState('Dark Maritime');
  const [layers, setLayers] = useState({
    vessels: true,
    ports: true,
    routes: true,
    weather: true,
    events: true
  });

  const countryBorderStyle = useMemo(() => ({
    color: theme.includes('Dark') ? '#00ff9d' : '#1e293b',
    weight: 0.5,
    opacity: theme.includes('Dark') ? 0.22 : 0.4,
    fillColor: 'transparent',
    fillOpacity: 0,
    interactive: false
  }), [theme]);

  // Determine if we are in a massive simulation mode
  const isSimulation = vessels.some(v => v.data_source_mode === 'SIMULATED');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Top Absolute UI */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        
        {/* Removed left counters block as requested */}

        {/* Right: Data Status */}
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px', whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '2px' }}>DATA STATUS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>AIS:</span> <strong style={{ color: systemHealth?.AIS === 'OK' ? '#10b981' : '#f59e0b' }}>{systemHealth?.AIS === 'OK' ? 'LIVE' : (systemHealth?.AIS || 'LIVE')}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>Weather:</span> <strong style={{ color: '#10b981' }}>LIVE</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>News:</span> <strong style={{ color: '#10b981' }}>LIVE</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span>Ports:</span> <strong style={{ color: '#3b82f6' }}>PUBLIC</strong></div>
          {isSimulation && <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}><span style={{ color: '#f43f5e', fontWeight: 'bold' }}>SIMULATION:</span> <strong style={{ color: '#f43f5e' }}>ON</strong></div>}
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={4}
        minZoom={2}
        maxZoom={18}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={true}
        style={{ width: '100%', height: '100%', minHeight: '420px', background: theme.includes('Dark') ? '#0a0e17' : '#f8fafc' }}
      >
        <TileLayer
          url={MAP_THEMES[theme].url}
          attribution={MAP_THEMES[theme].attr}
        />
        <GeoJSON data={stableGeoJson} style={countryBorderStyle} />
        <MapBoundsFitter vessels={layers.vessels ? vessels : []} ports={layers.ports ? ports : []} routes={layers.routes ? routes : []} events={layers.events ? events : []} />

        {/* Ports */}
        {layers.ports && ports.map((port) => (
          <CircleMarker
            key={`port_${port.port_id}`}
            center={[port.latitude, port.longitude]}
            radius={7}
            pathOptions={{
              color: port.congestion_level === 'HIGH' ? '#f43f5e' : (port.congestion_level === 'MEDIUM' ? '#f59e0b' : '#10b981'),
              fillColor: port.congestion_level === 'HIGH' ? '#f43f5e' : (port.congestion_level === 'MEDIUM' ? '#f59e0b' : '#10b981'),
              fillOpacity: 0.8,
              weight: 2
            }}
          >
            <Tooltip>{port.port_name} ({port.congestion_level} Traffic)</Tooltip>
            <Popup>
              <div style={{ fontSize: '0.85rem' }}>
                <strong style={{ color: '#00d2ff', fontSize: '1rem' }}>{port.port_name}</strong>
                <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>Occupancy: <strong>{port.port_occupancy}%</strong></div>
                  <div>Queue Wait: <strong>{port.average_waiting_time}h</strong></div>
                  <div>Status: <span style={{ color: port.congestion_level === 'HIGH' ? '#f43f5e' : '#10b981' }}>{port.congestion_level}</span></div>
                  <div>Source: <span style={{ color: '#94a3b8' }}>PUBLIC</span></div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Routes */}
        {layers.routes && routes.map((rt) => {
          const positions = (rt.waypoints || []).map(wp => [wp.lat, wp.lon]);
          if (positions.length < 2) return null;
          return (
            <Polyline
              key={`rt_${rt.route_id}`}
              positions={positions}
              pathOptions={{
                color: rt.is_recommended ? '#10b981' : (rt.risk_score > 60 ? '#f43f5e' : '#3a86ff'),
                weight: rt.is_recommended ? 4 : 2.5,
                dashArray: rt.is_recommended ? null : '6, 6',
                opacity: 0.9
              }}
            >
              <Tooltip sticky>{rt.route_name} - Risk: {rt.risk_score}%</Tooltip>
              <Popup>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: rt.is_recommended ? '#34d399' : '#60a5fa', fontSize: '1rem' }}>{rt.route_name}</strong>
                  {rt.is_recommended && <div style={{ fontSize: '0.7rem', color: '#10b981', marginBottom: '4px' }}>RECOMMENDED ROUTE</div>}
                  <div style={{ marginTop: '6px' }}>
                    <div>Distance: <strong>{rt.distance_nautical_miles} NM</strong></div>
                    <div>Travel Time: <strong>{rt.travel_time_hours} hrs</strong></div>
                    <div>Predicted Delay: <strong style={{ color: rt.predicted_delay_hours > 5 ? '#f43f5e' : '#10b981' }}>{rt.predicted_delay_hours} hrs</strong></div>
                    <div>Risk Score: <strong style={{ color: rt.risk_score > 50 ? '#f43f5e' : '#10b981' }}>{rt.risk_score}%</strong></div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }}>
                      Est Total Cost: <strong style={{ color: '#00d2ff' }}>${rt.estimated_total_cost?.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Weather Zones */}
        {layers.weather && weatherZones.map((zone, idx) => (
          <CircleMarker
            key={`wz_${idx}`}
            center={[zone.lat, zone.lon]}
            radius={zone.radius || 35}
            pathOptions={{ color: zone.color || '#f43f5e', fillColor: zone.color || '#f43f5e', fillOpacity: 0.2, dashArray: '4, 4' }}
          >
            <Tooltip>{zone.title} - Wind: {zone.wind}</Tooltip>
          </CircleMarker>
        ))}

        {/* Geopolitical Events */}
        {layers.events && events.map((ev, idx) => (
          <Marker key={`ev_${idx}`} position={[ev.latitude, ev.longitude]} icon={createEventIcon()}>
            <Tooltip>{ev.headline} ({ev.event_type})</Tooltip>
            <Popup>
              <div style={{ fontSize: '0.85rem', maxWidth: '220px' }}>
                <strong style={{ color: '#f59e0b', fontSize: '1rem' }}>{ev.headline}</strong>
                <div style={{ margin: '6px 0', color: '#cbd5e1' }}>{ev.description}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem' }}>
                  <div>Type: <strong>{ev.event_type}</strong></div>
                  <div>Risk: <strong style={{ color: '#f43f5e' }}>{ev.risk_score}</strong></div>
                  <div>Source: <span style={{ color: '#94a3b8' }}>{ev.source}</span></div>
                  <div>Published: <span style={{ color: '#94a3b8' }}>{new Date(ev.published_time).toLocaleDateString()}</span></div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vessel Markers (Clustered) */}
        {layers.vessels && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={40} spiderfyOnMaxZoom={true}>
            {vessels.map((vessel) => {
              if (!vessel.latitude || !vessel.longitude) return null;
              // Color based on risk/status conceptually (yellow if delayed/high risk, blue normal)
              const isHighRisk = vessel.status === 'DELAYED' || vessel.status === 'WAITING';
              const color = isHighRisk ? '#f59e0b' : '#00d2ff';
              
              return (
                <Marker key={`vsl_${vessel.vessel_id}`} position={[vessel.latitude, vessel.longitude]} icon={createVesselIcon(color)}>
                  <Tooltip>{vessel.vessel_name} ({vessel.vessel_type})</Tooltip>
                  <Popup>
                    <div style={{ fontSize: '0.85rem', minWidth: '200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: color, fontSize: '1rem' }}>{vessel.vessel_name}</strong>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>{vessel.data_source_mode || 'SIMULATED'}</span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '6px' }}>MMSI: {vessel.imo_number} | Type: {vessel.vessel_type}</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                        <div>Lat, Lon: <br/><strong style={{color:'#fff'}}>{vessel.latitude?.toFixed(2) ?? 'N/A'}, {vessel.longitude?.toFixed(2) ?? 'N/A'}</strong></div>
                        <div>Speed / Hdg: <br/><strong style={{color:'#fff'}}>{vessel.speed?.toFixed(1) ?? 'N/A'} kn / {vessel.heading ?? 'N/A'}&deg;</strong></div>
                        <div>Status: <br/><strong style={{ color: isHighRisk ? '#f59e0b' : '#10b981' }}>{vessel.navigation_status || vessel.status || 'UNKNOWN'}</strong></div>
                        <div>Dest: <br/><strong style={{color:'#fff'}}>{vessel.destination || 'N/A'}</strong></div>
                        <div style={{ gridColumn: 'span 2' }}>ETA: <strong style={{color:'#fff'}}>
                          {(() => {
                            if (!vessel.eta || vessel.eta === 'N/A') return 'N/A';
                            const isEst = vessel.eta.includes('|ESTIMATED');
                            const dStr = isEst ? vessel.eta.split('|')[0] : vessel.eta;
                            const d = new Date(dStr);
                            if (isNaN(d.getTime())) return 'N/A';
                            return `${d.toLocaleString()} ${isEst ? '(Estimated)' : ''}`;
                          })()}
                        </strong></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* Bottom Left Controls: Theme & Layers */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000, display: 'flex', gap: '12px' }}>
          
          {/* Map Theme Selector */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#00d2ff' }}>MAP THEME</div>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.8rem', width: '100%' }}>
              {Object.keys(MAP_THEMES).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Map Layers */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#00d2ff' }}>MAP LAYERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.keys(layers).map(layer => (
                <label key={layer} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={layers[layer]} onChange={() => setLayers(prev => ({...prev, [layer]: !prev[layer]}))} />
                  {layer}
                </label>
              ))}
            </div>
          </div>
          
          {/* Compact Legend */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#00d2ff' }}>LEGEND</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#00d2ff', borderRadius: '50%' }}></div> Vessel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></div> High Risk Vessel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div> Port</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '2px', background: '#10b981' }}></div> Route</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', background: '#f59e0b', transform: 'rotate(45deg)' }}></div> Event</div>
            </div>
          </div>

        </div>
      </MapContainer>
    </div>
  );
};

export default Map;
