import React, { useState } from 'react';

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

const SidepanelWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetails | null>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Platform selection
  const handlePlatformSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
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
            });
          }
        });
      });
    });
  };

  // Step 2: Fetch sampled expenses
  const fetchSampledExpenses = () => {
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

  // Step 3: Fetch single expense details
  const fetchExpenseDetails = (txn: Transaction) => {
    setLoading(true);
    setError('');
    setSelectedTxn(txn);
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id!, { action: 'fetchExpense', selectedTxn: txn }, (response) => {
        setLoading(false);
        if (response && response.data) {
          setExpenseDetails(response.data);
        } else {
          setError('Failed to fetch expense details.');
        }
      });
    });
  };

  // Step 4: Automate creation of similar expense
  const automateExpense = () => {
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
        } else {
          setError('Failed to automate expense.');
        }
      });
    });
  };

  // Render steps
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', minWidth: 320 }}>
      <h2>Expensabl Wizard</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading...</div>}
      {!loading && step === 1 && (
        <div>
          <label>Choose your expense platform:</label>
          <select value={platform} onChange={handlePlatformSelect} style={{ marginLeft: 8 }}>
            <option value="" disabled>Select a platform</option>
            <option value="navan">Navan</option>
            <option value="concur">Concur</option>
            <option value="expensify">Expensify</option>
          </select>
        </div>
      )}
      {!loading && step === 2 && (
        <div>
          <button onClick={fetchSampledExpenses}>Load Sampled Expenses</button>
          {transactions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label>Select a transaction:</label>
              <select onChange={e => {
                const txn = transactions.find(t => t.id === e.target.value) || null;
                setSelectedTxn(txn);
              }} style={{ marginLeft: 8 }}>
                <option value="" disabled selected>Select</option>
                {transactions.map(txn => (
                  <option key={txn.id} value={txn.id}>
                    {(txn.merchant?.name || 'Unknown Merchant') + ' - ' + (txn.merchantAmount || '')}
                  </option>
                ))}
              </select>
              <button style={{ marginLeft: 8 }} disabled={!selectedTxn} onClick={() => { setStep(3); if (selectedTxn) fetchExpenseDetails(selectedTxn); }}>Continue</button>
            </div>
          )}
        </div>
      )}
      {!loading && step === 3 && expenseDetails && (
        <div>
          <h3>Expense Details</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: 8 }}>{JSON.stringify(expenseDetails, null, 2)}</pre>
          <button onClick={() => { setStep(4); automateExpense(); }}>Automate This Expense</button>
        </div>
      )}
      {!loading && step === 4 && (
        <div>
          <h3>Automation Result</h3>
          {automationResult ? (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#e6ffe6', padding: 8 }}>{JSON.stringify(automationResult, null, 2)}</pre>
          ) : (
            <div>Waiting for result...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SidepanelWizard;