import React, { useState, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import Vessels from './pages/Vessels';
import RiskAnalysis from './pages/RiskAnalysis';
import RouteOptimization from './pages/RouteOptimization';
import QuantumOptimization from './pages/QuantumOptimization';
import Alerts from './pages/Alerts';
import AIPipeline from './pages/AIPipeline';
import { LayoutDashboard, Ship, ShieldAlert, Compass, Cpu, Bell, Activity, GitCommit } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  // Track which tabs have been visited so we mount them once and keep them alive
  const [visitedTabs, setVisitedTabs] = useState(new Set(['dashboard']));

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  };

  // Tab content config — each tab is mounted once on first visit, then kept alive via CSS
  const tabComponents = {
    'dashboard': <Dashboard onNavigateToRoute={(tab) => handleTabChange(tab)} />,
    'vessels': <Vessels />,
    'risk-analysis': <RiskAnalysis />,
    'route-optimization': <RouteOptimization />,
    'quantum-optimization': <QuantumOptimization />,
    'alerts': <Alerts />,
    'ai-pipeline': <AIPipeline />
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'vessels', label: 'Vessel Tracking', icon: Ship },
    { id: 'risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'route-optimization', label: 'Route Optimization', icon: Compass },
    { id: 'quantum-optimization', label: 'Quantum Optimizer', icon: Cpu },
    { id: 'alerts', label: 'Alerts & Decision Logs', icon: Bell },
    { id: 'ai-pipeline', label: 'AI Pipeline', icon: GitCommit }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navigation */}
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
          justify: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #00d2ff, #3a86ff)', padding: '8px', borderRadius: '10px' }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', background: 'linear-gradient(90deg, #f8fafc, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Supply Chain Decision Intelligence Platform
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>AI Risk Prediction & Graph Route Optimization</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
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
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                  color: isActive ? '#00d2ff' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderBottom: isActive ? '2px solid #00d2ff' : '2px solid transparent'
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Viewport — keep-alive tabs */}
      <main style={{ flex: 1, padding: '24px', paddingTop: '32px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {Object.entries(tabComponents).map(([tabId, component]) => (
          visitedTabs.has(tabId) && (
            <div key={tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
              {component}
            </div>
          )
        ))}
      </main>

      {/* Footer */}
      <footer style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.78rem', color: '#64748b' }}>
        Intelligent Supply Chain Risk Prediction and Route Optimization Platform &copy; 2026 | Powered by FastAPI, XGBoost, SHAP, NetworkX & React
      </footer>
    </div>
  );
};

export default App;
