const platformUrls = {
  navan: "https://app.navan.com/app/liquid/user/home",
  concur: "https://www.concursolutions.com/",
  expensify: "https://www.expensify.com/"
};

const inner = document.getElementById('inner');

// Step 1: Welcome and platform selection
function renderStep1() {
  console.log('Rendering Step 1: Platform selection');
  inner.innerHTML = `
    <h2>Welcome to Expensabl!</h2>
    <label for="platform">Choose your expense platform:</label>
    <select id="platform">
      <option value="" disabled selected>Select a platform</option>
      <option value="navan">Navan</option>
      <option value="concur">Concur</option>
      <option value="expensify">Expensify</option>
    </select>
    <div id="step1Status" style="margin:1em 0;"></div>
  `;
  console.log('Step 1 innerHTML set');

  const platformSelect = document.getElementById('platform');
  const statusDiv = document.getElementById('step1Status');

  platformSelect.addEventListener('change', async (event) => {
    const platform = event.target.value;
    const url = platformUrls[platform];
    statusDiv.textContent = "Navigating to platform for authentication...";
    // Navigate the current active tab to the selected platform
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.update(tab.id, { url }, () => {
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
        if (updatedTabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          // Programmatically inject content.js
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            // Now it's safe to send a message to the content script
            chrome.tabs.sendMessage(tab.id, { action: 'getSampledExpenses' }, (response) => {
              // Handle the response here
              console.log('Sampled expenses:', response);
            });
          });
        }
      });
      statusDiv.textContent = "Please authenticate with the platform, then return here to continue.";
      // Add the button only after updating the DOM
      statusDiv.insertAdjacentHTML('beforeend', `<br><button id="continueStep2">Continue</button>`);
      // Now the button exists, so you can safely set the onclick
      const continueBtn = document.getElementById('continueStep2');
      if (continueBtn) {
        continueBtn.onclick = renderStep2;
      } else {
        console.error('Continue button not found!');
      }
    });
    console.log('Navigated to:', url);
  });
}

// Step 2: Expense type selection
function renderStep2() {
  console.log('Rendering Step 2: Fetching sampled expenses');
  inner.innerHTML = `
    <h2>Sampled Expenses</h2>
    <div id="sampledExpensesList">Loading...</div>
  `;
  // Fetch sampled expenses from content.js
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) {
        reject('No active tab found');
        return;
      }
      console.log('Sending getSampledExpenses message to tab:', tab.id);
      chrome.tabs.sendMessage(tab.id, { action: 'getSampledExpenses' }, (response) => {
        console.log('Sent request to content.js:');
        const listDiv = document.getElementById('sampledExpensesList');
        if (response) {
          listDiv.textContent = JSON.stringify(response, null, 2);
          resolve(response);
        } else {
          console.log("No message kicked off or error occurred")
          listDiv.textContent = 'No expenses found.';
          resolve(null);
        }
      });
    });
  });
}

// Step 3: Show spinner and fetch transactions
function renderStep3() {
  inner.innerHTML = `
    <h2>Fetching Transactions...</h2>
    <div id="spinner">⏳ Loading...</div>
  `;
  document.getElementById('spinner').style.display = 'block';

  // Example: fetch transactions via content script
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getSampledResponses' }, (response) => {
      if (response && response.transactions) {
        renderStep4(response.transactions);
      } else {
        inner.innerHTML = `<div>Error loading transactions.</div>`;
      }
    });
  });
}

// Step 4: Show transactions
function renderStep4(transactions) {
  inner.innerHTML = `
    <h2>Select a Transaction</h2>
    <form id="txnForm">
      ${transactions.map((txn, i) =>
        `<label>
          <input type="radio" name="txn" value="${txn.id}" ${i === 0 ? 'checked' : ''}>
          ${txn.name || txn.description || 'Transaction'} - ${txn.amount || ''} (${txn.date || ''})
        </label><br>`
      ).join('')}
      <button type="submit">Submit</button>
    </form>
  `;
  document.getElementById('txnForm').onsubmit = (e) => {
    e.preventDefault();
    const selected = document.querySelector('input[name="txn"]:checked').value;
    inner.innerHTML = `<div>Submitted transaction ID: ${selected}</div>`;
    // Continue to next step or finish
  };
}

// Start the flow
renderStep1();

document.getElementById('openSite').onclick = async function() {
  const platform = document.getElementById('platform').value;
  const url = platformUrls[platform];
  const statusDiv = document.getElementById('status');
  const spinner = document.getElementById('spinner');
  statusDiv.textContent = "Opening site and waiting for sign-in...";
  spinner.style.display = "block";

  // Open the platform in the current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.update(tab.id, { url }, () => {
    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
      if (updatedTabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Programmatically inject content.js
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          // Now it's safe to send a message to the content script
          chrome.tabs.sendMessage(tab.id, { action: 'getSampledExpenses' }, (response) => {
            if (response && response.ready) {
              spinner.style.display = "none";
              statusDiv.textContent = "Select the expense report you want to automate:";
              const optionsDiv = document.getElementById('expenseOptions');
              optionsDiv.innerHTML = `
                <label><input type="radio" name="expenseType" value="Phone" checked> Phone</label><br>
                <label><input type="radio" name="expenseType" value="Internet"> Internet</label><br>
                <button id="submitExpenseType">Continue</button>
              `;
              document.getElementById('submitExpenseType').onclick = () => {
                const selectedType = document.querySelector('input[name="expenseType"]:checked').value;
                statusDiv.textContent = `You selected: ${selectedType}. Automating...`;
                chrome.tabs.sendMessage(tab.id, { action: 'fetchExpense', expenseType: selectedType }, (fetchResp) => {
                  if (fetchResp?.data) {
                    alert('Expense details fetched! Check console for data.');
                    console.log(fetchResp.data);
                  } else {
                    alert('Failed to fetch expense.');
                  }
                });
              };
            }
          });
        });
      }
    });
  });
};

// sidepanel.js
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.tabs.sendMessage(tab.id, { action: 'fetchTransactions' }, (response) => {
    // Use response.transactions to update your UI
  });
});