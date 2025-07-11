import React, { useState } from 'react';
import './Dashboard.css';

interface DashboardProps {
  onBackHome?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onBackHome }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'automated'>('scheduled');

  // Placeholder for API data
  // const [scheduledExpenses, setScheduledExpenses] = useState([]);
  // const [automatedExpenses, setAutomatedExpenses] = useState([]);
  // useEffect(() => { /* fetch scheduled and automated expenses here */ }, []);

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">Your Expensabl Dashboard</h1>
      {onBackHome && (
        <button className="wizard-back-btn" onClick={onBackHome}>&larr; Back Home</button>
      )}
      <div className="dashboard-section">
        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab${activeTab === 'scheduled' ? ' active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            Scheduled Expenses
          </button>
          <button
            className={`dashboard-tab${activeTab === 'automated' ? ' active' : ''}`}
            onClick={() => setActiveTab('automated')}
          >
            Successfully Automated
          </button>
        </div>
        <div className="dashboard-table-area">
          {activeTab === 'scheduled' ? (
            <div className="dashboard-placeholder">
              <span className="dashboard-icon scheduled">⏳</span>
              <p>No scheduled expenses yet.<br />Scheduled expenses will appear here.</p>
            </div>
          ) : (
            <div className="dashboard-placeholder">
              <span className="dashboard-icon automated">✅</span>
              <p>No automated expenses yet.<br />Automated expenses will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
