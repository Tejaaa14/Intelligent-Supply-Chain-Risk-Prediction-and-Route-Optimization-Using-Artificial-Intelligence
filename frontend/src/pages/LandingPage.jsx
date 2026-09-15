import React from 'react';
import { Ship, Anchor, Activity, ShieldAlert, Cpu, Network, Search, Watch, Navigation, BarChart3 } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-container">
      <div className="landing-overlay"></div>

      <div className="landing-content">
        <header className="landing-header">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <img src="/icon.png" alt="Platform Icon" />
            </div>
            <div className="landing-logo-text">
              Supply Chain Decision Intelligence Platform
            </div>
          </div>

        </header>

        <main className="landing-main">
          <div className="landing-hero-left">
            <div className="hero-subtitle">
              <Ship size={16} /> Smarter Oceans • Safer Routes • Stronger Supply Chains
            </div>
            <h1 className="hero-title">
              Intelligent Supply Chain
              <span>Decision Intelligence Platform</span>
            </h1>
            <p className="hero-description">
              Monitor global maritime operations, predict supply-chain disruptions, and optimize safer, faster, and cost-effective routes using real-time data, Artificial Intelligence, and quantum optimization.
            </p>

            <div className="hero-buttons">
              <button className="btn-primary" onClick={onGetStarted}>
                Get Started &rarr;
              </button>
              <button className="btn-secondary" onClick={() => {
                const featuresSection = document.getElementById('landing-features');
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}>
                Watch Overview
              </button>
            </div>

            <div className="hero-badges">
              <div className="hero-badge-item">
                <Network size={18} color="#00d2ff" /> Global Reach
              </div>
              <div className="hero-badge-item">
                <Cpu size={18} color="#00d2ff" /> AI-Powered
              </div>
              <div className="hero-badge-item">
                <ShieldAlert size={18} color="#00d2ff" /> Safer Routes
              </div>
              <div className="hero-badge-item">
                <Activity size={18} color="#00d2ff" /> Sustainable
              </div>
            </div>
          </div>


        </main>

        <section id="landing-features" className="landing-features-section">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-container">
                <Navigation size={24} />
              </div>
              <h3 className="feature-title">LIVE VESSEL INTELLIGENCE</h3>
              <p className="feature-description">
                Track global vessels using AIS and visualize current positions.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-container">
                <ShieldAlert size={24} />
              </div>
              <h3 className="feature-title">AI RISK PREDICTION</h3>
              <p className="feature-description">
                Analyze weather, port conditions, geopolitical events, and vessel data.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-container">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-title">PREDICTIVE DELAY & COST</h3>
              <p className="feature-description">
                Estimate shipment delays and operational cost impact.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-container">
                <Network size={24} />
              </div>
              <h3 className="feature-title">DYNAMIC ROUTE OPTIMIZATION</h3>
              <p className="feature-description">
                Find safer, faster, and cost-effective routes using real-world conditions.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-container">
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">QUANTUM OPTIMIZATION</h3>
              <p className="feature-description">
                Solve complex routing problems using QUBO and QAOA with Qiskit simulation.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-container">
                <Activity size={24} />
              </div>
              <h3 className="feature-title">DIGITAL TWIN SCENARIOS</h3>
              <p className="feature-description">
                Simulate disruptions and evaluate supply-chain impact.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
