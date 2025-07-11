import { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import SidepanelWizard from './SidepanelWizard';
import Dashboard from './Dashboard';
import './LandingPage.css';
import './index.css';
import './App.css';
import './Dashboard.css';


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
    return <Dashboard onBackHome={() => setPage('landing')} />;
  };
  return null;
}

export default App;