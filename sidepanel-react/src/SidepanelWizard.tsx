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

const TOTAL_STEPS = 4;

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

  const fetchDetails = () => {
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

  const renderProgress = () => {
    const percent = (step / TOTAL_STEPS) * 100;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 8, background: '#eee', borderRadius: 4 }}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: '#4caf50',
              borderRadius: 4,
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
        <div style={{ fontSize: 12, textAlign: 'right', marginTop: 4 }}>
          Step {step} of {TOTAL_STEPS}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', minWidth: 320 }}>
      <h2>Expensabl Wizard</h2>
      {onBackHome && <button onClick={onBackHome}>&larr; Back</button>}
      {renderProgress()}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading...</div>}

      {/* Step 1 */}
      {!loading && step === 1 && (
        <div>
          <h3>Select Your Platform</h3>
          <select value={platform} onChange={e => goToPlatform(e.target.value)}>
            <option value="" disabled>Select</option>
            <option value="navan">Navan</option>
            <option value="concur">Concur</option>
            <option value="expensify">Expensify</option>
          </select>
        </div>
      )}

      {/* Step 2 */}
      {!loading && step === 2 && (
        <div>
          <h3>Choose a Transaction</h3>
          <button onClick={loadExpenses}>Load My Expenses</button>
          {transactions.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <select onChange={e => {
                const txn = transactions.find(t => t.id === e.target.value);
                setSelectedTxn(txn || null);
              }}>
                <option value="">Select a transaction</option>
                {transactions.map(txn => (
                  <option key={txn.id} value={txn.id}>
                    {(txn.merchant?.name || 'Unknown')} - {txn.merchantAmount}
                  </option>
                ))}
              </select>
              <button disabled={!selectedTxn} onClick={fetchDetails} style={{ marginLeft: 8 }}>
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {!loading && step === 3 && expenseDetails && (
        <div>
          <h3>Review Expense</h3>
          <div style={{ background: '#f5f5f5', padding: 8 }}>
            <div><strong>Merchant:</strong> {expenseDetails.merchant?.name}</div>
            <div><strong>Amount:</strong> {expenseDetails.merchantAmount}</div>
            <div><strong>Date:</strong> {expenseDetails.date}</div>
            <div><strong>Description:</strong> {expenseDetails.description}</div>
          </div>
          <button onClick={automate} style={{ marginTop: 12 }}>Automate This Expense</button>
        </div>
      )}

      {/* Step 4 */}
      {!loading && step === 4 && (
        <div>
          <h3>Automation Complete 🎉</h3>
          {automationResult ? (
            <pre style={{ background: '#e6ffe6', padding: 8 }}>
              {JSON.stringify(automationResult, null, 2)}
            </pre>
          ) : (
            <div>Waiting for result...</div>
          )}
          <button onClick={() => {
            setStep(1);
            setPlatform('');
            setSelectedTxn(null);
            setExpenseDetails(null);
            setAutomationResult(null);
          }}>Start Over</button>
        </div>
      )}
    </div>
  );
};

export default SidepanelWizard;
