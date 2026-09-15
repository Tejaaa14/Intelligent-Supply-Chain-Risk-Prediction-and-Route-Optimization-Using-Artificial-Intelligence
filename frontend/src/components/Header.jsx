import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Menu, 
  User, 
  LogOut, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Bell, 
  Shield, 
  Database,
  ExternalLink,
  X
} from 'lucide-react';
import { getSystemHealth, getQuantumStatus, getDashboardSummary, getAlerts, logoutUser } from '../services/api';

const Header = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeTab, 
  onNavigateTab, 
  user, 
  onLogout,
  onOpenProfile
}) => {
  // System Health state
  const [healthData, setHealthData] = useState(null);
  const [quantumData, setQuantumData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);

  // Active alerts count
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Popover / Dropdown toggles
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Refs for outside click handling
  const statusRef = useRef(null);
  const userMenuRef = useRef(null);

  // Fetch system status and active alerts
  const fetchHeaderTelemetry = async () => {
    try {
      setHealthLoading(true);
      const [hRes, qRes, dRes, aRes] = await Promise.all([
        getSystemHealth().catch(() => null),
        getQuantumStatus().catch(() => null),
        getDashboardSummary().catch(() => null),
        getAlerts().catch(() => [])
      ]);

      if (hRes) {
        setHealthData(hRes);
        setHealthError(false);
      } else {
        setHealthError(true);
      }

      if (qRes) setQuantumData(qRes);
      if (dRes) setDashboardSummary(dRes);

      if (Array.isArray(aRes)) {
        const unresolved = aRes.filter(a => !a.is_resolved).length;
        setActiveAlertsCount(unresolved);
      } else if (dRes && typeof dRes.active_alerts === 'number') {
        setActiveAlertsCount(dRes.active_alerts);
      }
    } catch (err) {
      console.error('Header telemetry fetch error:', err);
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHeaderTelemetry();
    const interval = setInterval(fetchHeaderTelemetry, 30000); // 30s background sync
    return () => clearInterval(interval);
  }, []);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Overall System Status
  const getOverallStatus = () => {
    if (healthError || !healthData) {
      return { label: 'Unavailable', status: 'OFFLINE', color: '#94a3b8', dotColor: '#64748b' };
    }
    if (healthData.database === 'DOWN' || healthData.backend === 'DOWN') {
      return { label: 'Error', status: 'ERROR', color: '#f43f5e', dotColor: '#f43f5e' };
    }
    // Check if any service has ERROR status
    const hasError = Object.values(healthData).some(v => v === 'ERROR');
    if (hasError) {
      return { label: 'Degraded', status: 'DEGRADED', color: '#f59e0b', dotColor: '#f59e0b' };
    }
    return { label: 'Operational', status: 'OPERATIONAL', color: '#10b981', dotColor: '#10b981' };
  };

  const overall = getOverallStatus();

  // Compute Data Sources Status List
  const getDataSources = () => {
    const aisMode = healthData?.ais === 'OK' ? 'LIVE' : (healthData?.ais || 'SIMULATION');
    const weatherMode = healthData?.weather === 'OK' ? 'LIVE' : (healthData?.weather || 'LIVE');
    const newsMode = healthData?.news === 'OK' ? 'LIVE' : (healthData?.news || 'FALLBACK');
    const portMode = 'PUBLIC';
    const fuelMode = 'PUBLIC PROXY';
    const riskModelMode = healthData?.ml_service === 'OK' ? 'READY' : 'ERROR';
    const delayModelMode = healthData?.ml_service === 'OK' ? 'READY' : 'ERROR';
    const quantumMode = quantumData?.status === 'READY' ? 'READY' : (quantumData?.status || 'ERROR');
    const dbMode = healthData?.database === 'OK' ? 'CONNECTED' : (healthData?.database === 'DOWN' ? 'ERROR' : 'CONNECTED');

    return [
      { name: 'AIS', status: aisMode },
      { name: 'Weather', status: weatherMode },
      { name: 'GDELT News', status: newsMode },
      { name: 'PortWatch', status: portMode },
      { name: 'Fuel', status: fuelMode },
      { name: 'Risk Model', status: riskModelMode },
      { name: 'Delay Model', status: delayModelMode },
      { name: 'Quantum Optimizer', status: quantumMode },
      { name: 'Database', status: dbMode },
    ];
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'LIVE':
      case 'CONNECTED':
      case 'READY':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10b981'
        };
      case 'PUBLIC':
      case 'PUBLIC PROXY':
        return {
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          color: '#38bdf8'
        };
      case 'SIMULATION':
      case 'FALLBACK':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#f59e0b'
        };
      case 'ERROR':
      case 'DOWN':
        return {
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.3)',
          color: '#f43f5e'
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.3)',
          color: '#94a3b8'
        };
    }
  };

  // Format Last Updated Time from real backend timestamp
  const formatLastUpdated = () => {
    if (!dashboardSummary?.last_updated) return '--:--';
    try {
      const d = new Date(dashboardSummary.last_updated);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  // Safe logout handler
  const handleLogoutClick = async () => {
    setIsUserMenuOpen(false);
    try {
      await logoutUser().catch(() => {});
    } finally {
      if (onLogout) onLogout();
    }
  };

  return (
    <header
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '68px',
        boxSizing: 'border-box'
      }}
    >
      {/* Left Side: Unaltered Logo, Button & Platform Titles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '8px',
            marginRight: '4px',
            flexShrink: 0
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          title="Toggle Sidebar"
        >
          <Menu size={22} color="#94a3b8" />
        </button>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.25), rgba(58, 134, 255, 0.25))',
            border: '2px solid rgba(0, 210, 255, 0.5)',
            boxShadow: '0 0 14px rgba(0, 210, 255, 0.35)',
            flexShrink: 0
          }}
        >
          <img
            src="/icon.png"
            alt="Platform Icon"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            color: '#f8fafc', 
            background: 'linear-gradient(90deg, #f8fafc, #00d2ff)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            whiteSpace: 'nowrap',
            margin: 0
          }}>
            Supply Chain Decision Intelligence Platform
          </h1>
          <span style={{ 
            fontSize: '0.72rem', 
            color: '#94a3b8', 
            display: 'block', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            AI-Powered Risk Prediction • Dynamic Route Optimization • QAOA Quantum Simulation
          </span>
        </div>
      </div>

      {/* Right Side: Enhanced Operational Telemetry, Alerts & User Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, marginLeft: '16px' }}>
        
        {/* 1. System Status Indicator & Data Source Popover */}
        <div style={{ position: 'relative' }} ref={statusRef}>
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            style={{
              background: isStatusOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: isStatusOpen ? '1px solid rgba(0, 210, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#f8fafc',
              fontSize: '0.78rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseOut={(e) => {
              if (!isStatusOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            title="Click to view Data Source Statuses"
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: overall.dotColor,
                boxShadow: overall.status === 'OPERATIONAL' ? `0 0 8px ${overall.dotColor}` : 'none',
                display: 'inline-block'
              }}
            />
            <span style={{ fontWeight: 600, color: overall.color }}>{overall.label}</span>
            <ChevronDown size={14} color="#94a3b8" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>

          {/* Data Source Status Dropdown Popover */}
          {isStatusOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '270px',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 210, 255, 0.2)',
                padding: '14px',
                zIndex: 1100,
                animation: 'fadeIn 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data Source Status
                </span>
                <span style={{ fontSize: '0.68rem', color: overall.color, fontWeight: 600 }}>
                  ● {overall.label}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {getDataSources().map((src) => {
                  const badge = getStatusBadgeStyle(src.status);
                  return (
                    <div
                      key={src.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{src.name}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          letterSpacing: '0.02em',
                          fontFamily: 'monospace'
                        }}
                      >
                        {src.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Last Updated Timestamp */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.78rem', 
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '6px 10px',
            borderRadius: '8px'
          }}
          title="Latest successful backend telemetry refresh"
        >
          <Clock size={13} color="#64748b" />
          <span>Last Updated:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>
            {formatLastUpdated()}
          </span>
        </div>

        {/* 3. Notification Indicator (Active Alerts) */}
        <button
          onClick={() => onNavigateTab && onNavigateTab('alerts')}
          style={{
            background: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            border: activeAlertsCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
            color: activeAlertsCount > 0 ? '#f87171' : '#94a3b8',
            borderRadius: '8px',
            padding: '6px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)';
          }}
          title={`${activeAlertsCount} active alert${activeAlertsCount === 1 ? '' : 's'}. Click to open Alerts & Decision Logs`}
        >
          <Bell size={14} color={activeAlertsCount > 0 ? '#f87171' : '#94a3b8'} />
          <span>{activeAlertsCount}</span>
        </button>

        {/* 4. Logged-in User & Role Dropdown */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              background: isUserMenuOpen ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: isUserMenuOpen ? '1px solid rgba(0, 210, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              cursor: 'pointer',
              color: '#f8fafc',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseOut={(e) => {
              if (!isUserMenuOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            title="User Profile & Role"
          >
            <div style={{ background: 'rgba(0, 210, 255, 0.15)', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="#00d2ff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.username || 'User'}
              </span>
              <span style={{ 
                fontSize: '0.62rem', 
                fontWeight: 700, 
                color: '#00d2ff', 
                letterSpacing: '0.04em',
                lineHeight: 1.2,
                marginTop: '1px'
              }}>
                {user?.role || 'VIEWER'}
              </span>
            </div>
            <ChevronDown size={14} color="#94a3b8" style={{ transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '2px' }} />
          </button>

          {/* User Profile / Logout Dropdown */}
          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '230px',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 210, 255, 0.2)',
                padding: '14px',
                zIndex: 1100,
                animation: 'fadeIn 0.15s ease'
              }}
            >
              <div style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                  {user?.username || 'User'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all' }}>
                  {user?.email || 'user@supplychain.ai'}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(0, 210, 255, 0.15)',
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                    color: '#00d2ff',
                    letterSpacing: '0.04em'
                  }}>
                    {user?.role || 'VIEWER'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#cbd5e1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Shield size={14} color="#00d2ff" />
                  <span>Profile & Permissions</span>
                </button>

                <button
                  onClick={handleLogoutClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} color="#f87171" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
