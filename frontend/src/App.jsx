import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import Vessels from './pages/Vessels';
import RiskAnalysis from './pages/RiskAnalysis';
import RouteOptimization from './pages/RouteOptimization';
import QuantumOptimization from './pages/QuantumOptimization';
import Alerts from './pages/Alerts';
import { LayoutDashboard, Ship, ShieldAlert, Compass, Cpu, Bell, Activity, Menu, Shield, X, Lock, Key } from 'lucide-react';

import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import { getAuthMe, loginUser } from './services/api';

const App = () => {
  const [showLanding, setShowLanding] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path !== '/' && path !== '/index.html') {
      return false; // Show login if trying to access a protected route
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Track which tabs have been visited so we mount them once and keep them alive
  const [visitedTabs, setVisitedTabs] = useState(new Set(['dashboard']));

  // User authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('password123');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (token) {
          const u = await getAuthMe();
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    setUser(null);
    setShowLanding(true);
    showToast('Logged out successfully.');
    window.history.pushState(null, '', '/');
  };

  const handleRoleQuickLogin = async (roleKey) => {
    try {
      const res = await loginUser({ username: roleKey });
      if (res?.access_token) {
        localStorage.setItem('token', res.access_token);
        setUser(res.user);
        showToast('Login successful!');
        window.history.pushState(null, '', '/');
      }
    } catch (err) {
      console.error('Role login error:', err);
    }
  };

  const handleCustomLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await loginUser({ username: loginUsername, password: loginPassword });
      if (res?.access_token) {
        localStorage.setItem('token', res.access_token);
        setUser(res.user);
        showToast('Login successful!');
        window.history.pushState(null, '', '/');
      }
    } catch (err) {
      alert('Authentication failed: ' + (err.response?.data?.detail || 'Invalid credentials'));
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  };

  // Shared state for target vessel selection
  const [globalVesselId, setGlobalVesselId] = useState('');

  // Tab content config — each tab is mounted once on first visit, then kept alive via CSS
  const tabComponents = {
    'dashboard': <Dashboard onNavigateToRoute={(tab) => handleTabChange(tab)} />,
    'vessels': <Vessels globalVesselId={globalVesselId} setGlobalVesselId={setGlobalVesselId} />,
    'risk-analysis': <RiskAnalysis globalVesselId={globalVesselId} setGlobalVesselId={setGlobalVesselId} />,
    'route-optimization': <RouteOptimization globalVesselId={globalVesselId} setGlobalVesselId={setGlobalVesselId} />,
    'quantum-optimization': <QuantumOptimization globalVesselId={globalVesselId} setGlobalVesselId={setGlobalVesselId} />,
    'alerts': <Alerts />
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'vessels', label: 'Vessel Tracking', icon: Ship },
    { id: 'risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'route-optimization', label: 'Route Optimization', icon: Compass },
    { id: 'quantum-optimization', label: 'Quantum Optiz.', icon: Cpu },
    { id: 'alerts', label: 'Alerts & Decision Logs', icon: Bell }
  ];

  if (!user && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navigation */}
      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        onNavigateTab={handleTabChange}
        user={user}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {!user ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#0a0e17' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                display: 'inline-flex', 
                background: 'linear-gradient(135deg, #00d2ff, #3a86ff)', 
                padding: '12px', 
                borderRadius: '14px',
                marginBottom: '12px'
              }}>
                <Lock size={26} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                Platform Authentication
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Sign in to access protected supply chain intelligence
              </p>
            </div>

            <form onSubmit={handleCustomLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="admin, logistics_manager, analyst, or viewer"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d2ff, #3a86ff)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >
                Sign In with JWT
              </button>
            </form>

            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quick Role Sign-In
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Admin User', role: 'admin', badge: 'ADMIN' },
                  { label: 'Logistics Mgr', role: 'logistics_manager', badge: 'LOGISTICS' },
                  { label: 'Risk Analyst', role: 'analyst', badge: 'ANALYST' },
                  { label: 'Platform Viewer', role: 'viewer', badge: 'VIEWER' },
                ].map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleQuickLogin(r.role)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.12)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                  >
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>{r.label}</span>
                    <span style={{ fontSize: '0.62rem', color: '#00d2ff', fontWeight: 700 }}>{r.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar Navigation */}
          <aside style={{
            width: '240px',
            marginLeft: isSidebarOpen ? '0' : '-240px',
            transition: 'margin-left 0.3s ease',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                    color: isActive ? '#00d2ff' : '#94a3b8',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? '3px solid #00d2ff' : '3px solid transparent',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </aside>

          {/* Main Content Viewport — keep-alive tabs */}
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%' }}>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
              {Object.entries(tabComponents).map(([tabId, component]) => (
                visitedTabs.has(tabId) && (
                  <div key={tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                    {component}
                  </div>
                )
              ))}
            </div>
          </main>
        </div>
      )}

      {/* Profile & Permissions Modal */}
      {showProfileModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }} 
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 20px 45px rgba(0,0,0,0.8)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#00d2ff" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                  User Profile & Authorization
                </h3>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Account:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{user?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Email:</span>
                <span style={{ color: '#cbd5e1' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>System Role:</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(0, 210, 255, 0.15)',
                  border: '1px solid rgba(0, 210, 255, 0.3)',
                  color: '#00d2ff',
                  fontWeight: 700,
                  fontSize: '0.72rem'
                }}>
                  {user?.role}
                </span>
              </div>

              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Role Scope & Capabilities
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {user?.role === 'ADMIN' && 'Full administrative authority across AI models, NetworkX route optimizations, QAOA quantum executions, what-if scenarios, and audit logs.'}
                  {user?.role === 'LOGISTICS MANAGER' && 'Operational functions: real-time vessel monitoring, route dispatch evaluation, port turnaround scheduling, and alert management.'}
                  {user?.role === 'ANALYST' && 'Analytical functions: ML risk classification, XGBoost delay regressions, SHAP factor contributions, and scenario modeling.'}
                  {user?.role === 'VIEWER' && 'Read-only access: viewing telemetry dashboard, global route network, vessel positions, and weather conditions.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.78rem', color: '#64748b' }}>
        Intelligent Supply Chain Risk Prediction and Route Optimization Platform &copy; 2026 | Powered by FastAPI, XGBoost, SHAP, NetworkX & React
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.includes('successful') ? '#10b981' : '#f43f5e',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.3s ease'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
