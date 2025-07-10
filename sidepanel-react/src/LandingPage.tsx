import React from 'react';
import './LandingPage.css'; 

console.log("LandingPage component loaded");
const LandingPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => (
  <div className="landing-root">
    <div className="landing-card">
      <h1 className="landing-title">Welcome to Expensabl</h1>
      <p className="landing-subtitle">
        Supercharge your expense workflow! Expensabl automates your recurring expense reports, saving you time and money. <br />
        Effortless. Accurate. Fast.
      </p>
      <div className="landing-actions">
        <button className="panel-btn automate" onClick={() => onNavigate('automate')}>Automate Expenses</button>
        <button className="panel-btn dashboard" onClick={() => onNavigate('dashboard')}>View Dashboard</button>
      </div>
    </div>
    <footer className="landing-footer">Expensabl &copy; {new Date().getFullYear()}</footer>
  </div>
);

export default LandingPage;
