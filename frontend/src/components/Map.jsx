import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, GeoJSON, useMap, Tooltip, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import countryGeoJson from '../assets/countries.json';

// Fix default leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Markers
const createVesselIcon = (color = '#00d2ff', isSelected = false) => {
  const size = isSelected ? 36 : 28;
  const stroke = isSelected ? `<circle cx="12" cy="12" r="11" stroke="#f43f5e" stroke-width="2" fill="none" />` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="${size}" height="${size}" style="filter: drop-shadow(0 0 ${isSelected ? '10px' : '6px'} ${color});">
    ${stroke}
    <path d="M2 19.5c0 0 3-1 10-1s10 1 10 1v.5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-.5zm2-3.5h16l-1.5-6H5.5L4 16zm4-7.5V4h8v4.5h-8z"/>
  </svg>`;
  return L.divIcon({ html: svg, className: 'custom-vessel-icon', iconSize: [size, size], iconAnchor: [size/2, size/2] });
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

// Auto-fitter Component — only runs on initial mount to set initial view
const MapBoundsFitter = ({ vessels, ports, routes, events }) => {
  const map = useMap();
  const hasFitted = React.useRef(false);
  useEffect(() => {
    // Fix tile rendering: invalidate size after layout settles
    setTimeout(() => map.invalidateSize(), 200);

    if (hasFitted.current) return;

    let points = [];
    if (vessels?.length) vessels.forEach(v => { if (v.latitude && v.longitude) points.push([v.latitude, v.longitude]); });
    if (ports?.length) ports.forEach(p => { if (p.latitude && p.longitude) points.push([p.latitude, p.longitude]); });
    if (events?.length) events.forEach(e => { if (e.latitude && e.longitude) points.push([e.latitude, e.longitude]); });
    if (routes?.length) routes.forEach(r => { if (r.waypoints) r.waypoints.forEach(wp => points.push([wp.lat, wp.lon])); });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      hasFitted.current = true;
    }
  }, [vessels, ports, routes, events, map]);
  return null;
};

// FlyToVessel — smoothly pan/zoom to the selected vessel when selection changes
const FlyToVessel = ({ vessels, selectedVesselId }) => {
  const map = useMap();
  useEffect(() => {
    if (!selectedVesselId || !vessels?.length) return;
    const v = vessels.find(vsl => vsl.vessel_id === selectedVesselId);
    if (v && v.latitude && v.longitude) {
      map.flyTo([v.latitude, v.longitude], 10, { duration: 1.2 });
    }
  }, [selectedVesselId, vessels, map]);
  return null;
};

const Map = ({ vessels = [], ports = [], routes = [], weatherZones = [], events = [], systemHealth = null, selectedVesselId = null }) => {
  const defaultCenter = [18.0, 115.0];
  const stableGeoJson = useMemo(() => countryGeoJson, []);

  const [theme, setTheme] = useState('Dark Maritime');
  const [showThemes, setShowThemes] = useState(false);
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
      <MapContainer
        center={defaultCenter}
        zoom={4}
        minZoom={2}
        zoomControl={false}
        attributionControl={false}
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
        <FlyToVessel vessels={vessels} selectedVesselId={selectedVesselId} />

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
              const isSelected = vessel.vessel_id === selectedVesselId;
              const isHighRisk = vessel.status === 'DELAYED' || vessel.status === 'WAITING';
              const color = isSelected ? '#f43f5e' : (isHighRisk ? '#f59e0b' : '#00d2ff');
              
              return (
                <Marker key={`vsl_${vessel.vessel_id}`} position={[vessel.latitude, vessel.longitude]} icon={createVesselIcon(color, isSelected)}>
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

        <ZoomControl position="bottomright" />

        {/* Custom style to make zoom controls match the glass UI panel */}
        <style>{`
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            margin-right: 10px !important;
            margin-bottom: 20px !important;
          }
          .leaflet-control-zoom a {
            background: rgba(15, 23, 42, 0.85) !important;
            backdrop-filter: blur(8px) !important;
            color: #00d2ff !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            width: 38px !important;
            height: 38px !important;
            line-height: 38px !important;
            transition: all 0.2s ease;
          }
          .leaflet-control-zoom a:first-child {
            border-bottom: none !important;
            border-top-left-radius: 8px !important;
            border-top-right-radius: 8px !important;
          }
          .leaflet-control-zoom a:last-child {
            border-bottom-left-radius: 8px !important;
            border-bottom-right-radius: 8px !important;
          }
          .leaflet-control-zoom a:hover {
            background: rgba(30, 41, 59, 0.95) !important;
            color: #fff !important;
            border-color: #00d2ff !important;
          }
        `}</style>

        {/* Bottom Right Theme Control */}
        <div style={{ position: 'absolute', bottom: 130, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {showThemes && (
            <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.keys(MAP_THEMES).map(t => {
                // Background image logic
                const bgImage = t.includes('Dark') ? 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80)' : 
                                t.includes('Light') ? 'url(https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=150&q=80)' :
                                t === 'Satellite' ? 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=150&q=80)' :
                                'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&q=80)';
                
                return (
                  <div 
                    key={t}
                    onClick={() => { setTheme(t); setShowThemes(false); }}
                    style={{ 
                      width: '68px', height: '68px', 
                      backgroundImage: bgImage,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      border: theme === t ? '2px solid #00d2ff' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                      fontSize: '0.65rem', color: '#fff', fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: theme === t ? 'rgba(0, 210, 255, 0.2)' : 'rgba(0,0,0,0.4)', transition: 'all 0.2s ease' }} />
                    <span style={{ position: 'relative', zIndex: 1, padding: '0 4px' }}>{t}</span>
                  </div>
                );
              })}
            </div>
          )}
          <button 
            onClick={() => setShowThemes(!showThemes)}
            style={{ 
              background: 'rgba(15, 23, 42, 0.85)', 
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(255,255,255,0.2)', 
              color: '#00d2ff', 
              width: '44px', height: '44px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#00d2ff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Layers size={22} />
          </button>
        </div>

        {/* Bottom Left Controls: Layers & Legend */}
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, display: 'flex', gap: '8px' }}>
          {/* Map Layers */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.7rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#00d2ff' }}>LAYERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {Object.keys(layers).map(layer => (
                <label key={layer} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={layers[layer]} onChange={() => setLayers(prev => ({...prev, [layer]: !prev[layer]}))} style={{ margin: 0 }} />
                  {layer}
                </label>
              ))}
            </div>
          </div>
          
          {/* Compact Legend */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.7rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#00d2ff' }}>LEGEND</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#00d2ff', borderRadius: '50%' }}></div> Vessel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }}></div> High Risk</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div> Port</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '12px', height: '2px', background: '#10b981' }}></div> Route</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#f59e0b', transform: 'rotate(45deg)' }}></div> Event</div>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
};

export default Map;
