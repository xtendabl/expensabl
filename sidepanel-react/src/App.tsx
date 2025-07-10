import { useState, useEffect } from 'react';
import './App.css';
import LandingPage from './LandingPage';
import './LandingPage.css';
import './index.css';
import SidepanelWizard from './SidepanelWizard';

function App() {
  const [page, setPage] = useState<'landing' | 'wizard' | 'dashboard'>('landing');

  useEffect(() => {
    console.log('Current page state:', page);
  }, [page]);

  const handleNavigate = (target: string) => {
    console.log('Navigating to:', target);
    if (target === 'automate') setPage('wizard');
    if (target === 'dashboard') setPage('dashboard');
  };

  if (page === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }
  if (page === 'wizard') {
    return <SidepanelWizard onBackHome={() => setPage('landing')} />;
  }
  if (page === 'dashboard') {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>Dashboard (Coming Soon)</h2>
        <button onClick={() => setPage('landing')}>Back to Home</button>
      </div>
    );
  }
  return null;
}

export default App;