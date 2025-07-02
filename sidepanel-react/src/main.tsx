import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'
import App from './App.tsx'
import SidepanelWizard from './SidepanelWizard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <SidepanelWizard />
  </React.StrictMode>
);
