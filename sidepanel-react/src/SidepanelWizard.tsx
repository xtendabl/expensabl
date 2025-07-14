import React, { useState } from 'react';
import './SidepanelWizard.css';

const platformUrls: Record<string, string> = {
  navan: "https://app.navan.com/app/liquid/user/home",
  concur: "https://www.concursolutions.com/",
  expensify: "https://www.expensify.com/"
};

type Transaction = {
  id: string;
  merchant?: { name?: string };
  merchantAmount?: string;
  [key: string]: any;
};

type ExpenseDetails = {
  merchant?: any;
  merchantAmount?: any;
  currency?: any;
  date?: any;
  category?: any;
  description?: any;
  [key: string]: any;
};

const SidepanelWizard: React.FC<{ onBackHome?: () => void }> = ({ onBackHome }) => {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetails | null>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToPlatform = (value: string) => {
    setPlatform(value);
    setError('');
    setLoading(true);
    const url = platformUrls[value];
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.update(tab.id!, { url }, () => {
        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
          if (updatedTabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({
              target: { tabId: tab.id! },
              files: ['content.js']
            }, () => {
              setLoading(false);
              setStep(2);
              // Automatically load expenses after platform is selected and page is ready
              loadExpenses();
            });
          }
        });
      });
    });
  };

  const loadExpenses = () => {
    setLoading(true);
    setError('');
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id!, { action: 'getSampledExpenses' }, (response) => {
        setLoading(false);
        if (response && response.data && response.data._embedded) {
          setTransactions(response.data._embedded.transactions || []);
        } else {
          setError('No transactions found.');
        }
      });
    });
  };

  const fetchDetails = (selectedTxn: Transaction) => {
    if (!selectedTxn) return;
    setLoading(true);
    setError('');
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id!, { action: 'fetchExpense', selectedTxn }, (response) => {
        setLoading(false);
        if (response && response.data) {
          setExpenseDetails(response.data);
          setStep(3);
        } else {
          setError('Failed to fetch expense details.');
        }
      });
    });
  };

  const automate = () => {
    if (!expenseDetails) return;
    setLoading(true);
    setError('');
    const postBody = {
      merchant: expenseDetails.merchant,
      merchantAmount: expenseDetails.merchantAmount,
      currency: expenseDetails.currency,
      date: expenseDetails.date,
      category: expenseDetails.category,
      description: expenseDetails.description,
    };
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id!, { action: 'createExpense', body: postBody }, (response) => {
        setLoading(false);
        if (response && response.data) {
          setAutomationResult(response.data);
          setStep(4);
        } else {
          setError('Failed to automate expense.');
        }
      });
    });
  };

  return (
    <div className="wizard-root">
      <h2 className="wizard-header">Expensabl Wizard</h2>
      {onBackHome && (
        <button className="wizard-back-btn" onClick={onBackHome}>&larr; Back Home</button>
      )}
      {error && <div className="wizard-error">{error}</div>}
      {loading && <div>Loading...</div>}
      {!loading && step === 1 && (
        <div className="wizard-section">
          <label className="wizard-label">Choose your expense platform:</label>
          <select className="wizard-select" value={platform} onChange={e => goToPlatform(e.target.value)}>
            <option value="" disabled>Select a platform</option>
            <option value="navan">Navan</option>
            <option value="concur">Concur</option>
            <option value="expensify">Expensify</option>
          </select>
        </div>
      )}
      {!loading && step === 2 && (
        <div className="wizard-section">
          {loading ? (
            <div>Loading expenses...</div>
          ) : transactions.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <label className="wizard-label">Select a transaction:</label>
              <select className="wizard-select" onChange={e => {
                const txn = transactions.find(t => t.id === e.target.value) || null;
                setSelectedTxn(txn);
              }}>
                <option value="" disabled selected>Select</option>
                {transactions.map(txn => (
                  <option key={txn.id} value={txn.id}>
                    {(txn.merchant?.name || 'Unknown Merchant') + ' - ' + (txn.merchantAmount || '')}
                  </option>
                ))}
              </select>
              <button className="wizard-btn" style={{ marginLeft: 8 }} disabled={!selectedTxn} onClick={() => { setStep(3); if (selectedTxn) fetchDetails(selectedTxn); }}>Continue</button>
            </div>
          ) : (
            <div>No transactions found.</div>
          )}
        </div>
      )}
      {!loading && step === 3 && expenseDetails && (
        <div className="wizard-section">
          <h3>Expense Details</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: 8 }}>{JSON.stringify(expenseDetails, null, 2)}</pre>
          <button className="wizard-btn" onClick={() => { setStep(4); automate(); }}>Automate This Expense</button>
        </div>
      )}
      {!loading && step === 4 && (
        <div className="wizard-section">
          <h3>Automation Result</h3>
          {automationResult ? (
            <pre className="wizard-success" style={{ whiteSpace: 'pre-wrap', background: '#e6ffe6', padding: 8 }}>{JSON.stringify(automationResult, null, 2)}</pre>
          ) : (
            <div>Waiting for result...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SidepanelWizard;
