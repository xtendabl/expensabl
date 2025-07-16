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

// Step 2: Expense type selection with template option
function renderStep2() {
  console.log('Rendering Step 2: Expense method selection');
  inner.innerHTML = `
    <h2>Choose Your Expense Method</h2>
    <div style="margin: 1em 0;">
      <button id="useTemplateBtn" style="margin-right: 10px; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Use Template</button>
      <button id="useManualBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Manual Entry</button>
    </div>
    <div id="methodContent">
      <div style="text-align: center; color: #666; margin: 40px 0;">
        <p>Select your preferred expense creation method above.</p>
      </div>
    </div>
  `;

  // Add event listeners for template and manual buttons
  document.getElementById('useTemplateBtn').onclick = () => {
    renderStep2_5_TemplateSelection();
  };

  document.getElementById('useManualBtn').onclick = () => {
    renderManualExpenseSelection();
  };
}

// Step 2.5: Template selection step (new intermediate step)
function renderStep2_5_TemplateSelection() {
  console.log('Rendering Step 2.5: Template selection');
  inner.innerHTML = `
    <h2>Select a Template</h2>
    <div style="margin-bottom: 20px;">
      <button id="backToMethodBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">← Back to Method Selection</button>
    </div>
    <div id="templateSelectionContent">
      <div id="templatesList">Loading templates...</div>
    </div>
    <div style="margin-top: 20px; display: flex; gap: 10px;">
      <button id="manageTemplatesBtn" style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer;">Manage Templates</button>
      <button id="skipTemplatesBtn" style="padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 3px; cursor: pointer;">Skip & Use Manual</button>
      <button id="testContentScriptBtn" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Test Content Script</button>
    </div>
    <div id="methodContent"></div>
  `;

  // Add event listeners
  document.getElementById('backToMethodBtn').onclick = () => {
    renderStep2();
  };

  document.getElementById('manageTemplatesBtn').onclick = () => {
    renderTemplateManagement();
  };

  document.getElementById('skipTemplatesBtn').onclick = () => {
    renderManualExpenseSelection();
  };

  document.getElementById('testContentScriptBtn').onclick = () => {
    testContentScript();
  };

  // Load templates
  loadTemplateSelectionList();
}

// Load templates for selection (enhanced version)
function loadTemplateSelectionList() {
  console.log('🔵 Loading template selection list...');
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      console.error('❌ No active tab found during loadTemplateSelectionList');
      document.getElementById('templatesList').innerHTML = '<div style="color: red;">No active tab found.</div>';
      return;
    }

    console.log('🔵 Sending getAllTemplates message to tab:', tab.id, 'URL:', tab.url);
    chrome.tabs.sendMessage(tab.id, { action: 'getAllTemplates' }, (response) => {
      console.log('🔵 getAllTemplates response:', response);
      console.log('🔵 Response type:', typeof response);
      console.log('🔵 Response has templates?', response && response.templates);
      console.log('🔵 Templates array:', response?.templates);
      console.log('🔵 Templates length:', response?.templates?.length);
      
      if (chrome.runtime.lastError) {
        console.error('❌ Chrome runtime error during getAllTemplates:', chrome.runtime.lastError);
        document.getElementById('templatesList').innerHTML = `<div style="color: red;">Chrome extension error: ${chrome.runtime.lastError.message}</div>`;
        return;
      }
      const listDiv = document.getElementById('templatesList');
      
      if (response && response.templates && Array.isArray(response.templates)) {
        const templates = response.templates;
        console.log('Processing templates:', templates);
        
        if (templates.length === 0) {
          listDiv.innerHTML = `
            <div style="text-align: center; color: #666; margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
              <h3 style="margin-top: 0;">No Templates Found</h3>
              <p>Create your first template by completing a manual expense entry.</p>
              <button onclick="renderManualExpenseSelection()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Create Manual Expense</button>
            </div>
          `;
        } else {
          // Sort templates by creation date (newest first)
          templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          console.log('About to render templates HTML...');
          console.log('Templates after sort:', templates);
          
          const templateHTML = templates.map(template => {
            console.log('Processing template for HTML:', template.name, template.id);
            return `
                <div class="template-selection-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; cursor: pointer; transition: background-color 0.2s;" 
                     data-template-id="${template.id}"
                     onmouseover="this.style.backgroundColor='#e9ecef'" 
                     onmouseout="this.style.backgroundColor='#f9f9f9'">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <h4 style="margin: 0 0 8px 0; color: #333; font-size: 1.1em;">${template.name}</h4>
                      <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9em;">${template.description || 'No description'}</p>
                      <div style="font-size: 0.85em; color: #999; margin-bottom: 8px;">
                        <div style="margin-bottom: 4px;">💰 <strong>$${template.expenseData.merchantAmount}</strong> - ${template.expenseData.merchant.name}</div>
                        <div style="margin-bottom: 4px;">🔄 ${template.frequency.charAt(0).toUpperCase() + template.frequency.slice(1)} recurring</div>
                        <div>📅 Created: ${new Date(template.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style="margin-left: 15px;">
                      <button class="use-template-btn" data-template-id="${template.id}"
                              style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">
                        Use Template
                      </button>
                    </div>
                  </div>
                </div>
              `; // End of template HTML
          }).join('');
          
          console.log('Generated template HTML:', templateHTML);
          
          listDiv.innerHTML = `
            <div style="display: grid; gap: 12px; margin-top: 10px;">
              ${templateHTML}
            </div>
          `;
          
          // Add event listeners to Use Template buttons
          console.log('🔵 Adding event listeners to Use Template buttons...');
          const useTemplateButtons = document.querySelectorAll('.use-template-btn');
          console.log('🔵 Found', useTemplateButtons.length, 'Use Template buttons');
          
          useTemplateButtons.forEach(button => {
            const templateId = button.getAttribute('data-template-id');
            console.log('🔵 Adding event listener for template:', templateId);
            
            button.addEventListener('click', (event) => {
              event.stopPropagation();
              console.log('🔵 Use Template button clicked for template:', templateId);
              selectTemplateForWorkflow(templateId);
            });
          });
          
          // Add event listeners to template cards for click-anywhere functionality
          const templateCards = document.querySelectorAll('.template-selection-card');
          templateCards.forEach(card => {
            const templateId = card.getAttribute('data-template-id');
            card.addEventListener('click', (event) => {
              // Only trigger if the click wasn't on the button
              if (!event.target.classList.contains('use-template-btn')) {
                console.log('🔵 Template card clicked for template:', templateId);
                selectTemplateForWorkflow(templateId);
              }
            });
          });
        }
      } else {
        console.error('Unexpected response structure:', response);
        listDiv.innerHTML = `<div style="color: red;">Error loading templates: ${response?.error || 'Unexpected response structure'}</div>`;
      }
    });
  });
}

// Template selection interface
function renderTemplateSelection() {
  console.log('Rendering template selection');
  const contentDiv = document.getElementById('methodContent');
  if (!contentDiv) {
    console.error('methodContent element not found');
    return;
  }
  contentDiv.innerHTML = `
    <h3>Select a Template</h3>
    <div id="templatesList">Loading templates...</div>
    <div style="margin-top: 20px;">
      <button id="manageTemplatesBtn" style="margin-right: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Manage Templates</button>
      <button id="backToManualBtn" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Back to Manual</button>
    </div>
  `;

  // Load templates
  loadTemplatesList();

  // Add event listeners
  document.getElementById('manageTemplatesBtn').onclick = () => {
    renderTemplateManagement();
  };

  document.getElementById('backToManualBtn').onclick = () => {
    renderManualExpenseSelection();
  };
}

// Load and display templates list
function loadTemplatesList() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      document.getElementById('templatesList').innerHTML = '<div style="color: red;">No active tab found.</div>';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'getAllTemplates' }, (response) => {
      const listDiv = document.getElementById('templatesList');
      
      if (response && response.templates) {
        const templates = response.templates;
        
        if (templates.length === 0) {
          listDiv.innerHTML = `
            <div style="text-align: center; color: #666; margin: 20px 0;">
              <p>No templates found.</p>
              <p>Create your first template by completing a manual expense entry.</p>
            </div>
          `;
        } else {
          listDiv.innerHTML = `
            <div style="display: grid; gap: 10px; margin-top: 10px;">
              ${templates.map(template => `
                <div class="template-card" style="border: 1px solid #ddd; padding: 12px; border-radius: 5px; background: #f9f9f9;">
                  <div style="display: flex; justify-content: between; align-items: center;">
                    <div style="flex: 1;">
                      <h4 style="margin: 0 0 5px 0; color: #333;">${template.name}</h4>
                      <p style="margin: 0 0 5px 0; color: #666; font-size: 0.9em;">${template.description || 'No description'}</p>
                      <div style="font-size: 0.8em; color: #999;">
                        <span>Amount: $${template.expenseData.merchantAmount}</span> | 
                        <span>Frequency: ${template.frequency}</span> | 
                        <span>Created: ${new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style="margin-left: 10px;">
                      <button onclick="selectTemplate('${template.id}')" style="padding: 6px 12px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Use</button>
                      <button onclick="editTemplate('${template.id}')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>
                      <button onclick="deleteTemplate('${template.id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Delete</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      } else {
        listDiv.innerHTML = `<div style="color: red;">Error loading templates: ${response?.error || 'Unknown error'}</div>`;
      }
    });
  });
}

// Manual expense selection (original Step 2 functionality)
function renderManualExpenseSelection() {
  console.log('Rendering manual expense selection');
  const contentDiv = document.getElementById('methodContent');
  if (!contentDiv) {
    console.error('methodContent element not found');
    return;
  }
  contentDiv.innerHTML = `
    <h3>Select a Transaction</h3>
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
          // listDiv.textContent = JSON.stringify(response, null, 2);
            // Create a dropdown of all transactions showing merchant.name and merchantAmount
            const transactions = response.data._embedded.transactions || [];
            if (transactions.length === 0) {
              listDiv.textContent = 'No transactions found.';
            } else {
              const selectHtml = `
                <label for="transactionsDropdown">Select a transaction:</label>
                <select id="transactionsDropdown">
                  ${transactions.map(txn => `
                    <option value="${txn.id}">
                      ${txn.merchant?.name || 'Unknown Merchant'} - ${txn.merchantAmount || ''}
                    </option>
                  `).join('')}
                </select>
                <button id="continueToStep3">Continue</button>
              `;
              listDiv.innerHTML = selectHtml;

              // Add event listener for the continue button
              document.getElementById('continueToStep3').onclick = () => {
                const dropdown = document.getElementById('transactionsDropdown');
                const selectedId = dropdown.value;
                console.log('Selected dropdownID:', selectedId);
                // Find the selected transaction object
                const selectedTxn = transactions.find(txn => txn.id === selectedId);
                console.log('Selected transaction:', selectedTxn);
                // Pass the selected transaction id (or object) to renderStep3
                renderStep3(selectedTxn);
              };
            }
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
function renderStep3(selectedTxn) {
  inner.innerHTML = `
    <h2>Fetching Single Expense...</h2>
    <div id="spinner">⏳ Loading...</div>
    <div id="expenseResult"></div>
  `;
  document.getElementById('spinner').style.display = 'block';

  // Send selectedTxn to content.js to fetch related transactions
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) {
        reject('No active tab found');
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'fetchExpense', selectedTxn }, (response) => {
        const spinner = document.getElementById('spinner');
        const resultDiv = document.getElementById('expenseResult');
        spinner.style.display = 'none';
        console.log('Fetched expense response:', response);
        if (response) {
          // Render the fetched expense details with save as template button
          resultDiv.innerHTML = `
            <h3>Expense Details</h3>
            <div style="margin-bottom: 15px;">
              <button id="saveAsTemplateBtn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Save as Template</button>
              <button id="createExpenseBtn" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer;">Create Expense</button>
            </div>
            <pre style="white-space:pre-wrap;">${JSON.stringify(response, null, 2)}</pre>
          `;
          
          // Add event listeners for template and expense buttons
          document.getElementById('saveAsTemplateBtn').onclick = () => {
            showSaveTemplateModal(response.data);
          };
          
          document.getElementById('createExpenseBtn').onclick = () => {
            createExpenseFromData(response.data);
          };
          
          resolve(response);
        } else {
          resultDiv.innerHTML = `<div>Error loading expense details.</div>`;
          resolve(null);
        }
      });
    });
  });
}

// // Step 4: Show transactions
// function renderStep4(transactions) {
//   inner.innerHTML = `
//     <h2>Select a Transaction</h2>
//     <form id="txnForm">
//       ${transactions.map((txn, i) =>
//         `<label>
//           <input type="radio" name="txn" value="${txn.id}" ${i === 0 ? 'checked' : ''}>
//           ${txn.name || txn.description || 'Transaction'} - ${txn.amount || ''} (${txn.date || ''})
//         </label><br>`
//       ).join('')}
//       <button type="submit">Submit</button>
//     </form>
//   `;
//   document.getElementById('txnForm').onsubmit = (e) => {
//     e.preventDefault();
//     const selected = document.querySelector('input[name="txn"]:checked').value;
//     inner.innerHTML = `<div>Submitted transaction ID: ${selected}</div>`;
//     // Continue to next step or finish
//   };
// }

// Template Management Functions

// Show save template modal
function showSaveTemplateModal(expenseData) {
  const modal = document.createElement('div');
  modal.id = 'saveTemplateModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%;">
      <h3 style="margin-top: 0;">Save as Template</h3>
      <form id="saveTemplateForm">
        <div style="margin-bottom: 15px;">
          <label for="templateName" style="display: block; margin-bottom: 5px;">Template Name:</label>
          <input type="text" id="templateName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" placeholder="e.g., Monthly Phone Bill">
        </div>
        <div style="margin-bottom: 15px;">
          <label for="templateDescription" style="display: block; margin-bottom: 5px;">Description:</label>
          <textarea id="templateDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" rows="3" placeholder="Optional description"></textarea>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="templateFrequency" style="display: block; margin-bottom: 5px;">Frequency:</label>
          <select id="templateFrequency" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="cancelSaveTemplate" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
          <button type="submit" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Save Template</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('cancelSaveTemplate').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('saveTemplateForm').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('templateName').value;
    const description = document.getElementById('templateDescription').value;
    const frequency = document.getElementById('templateFrequency').value;
    
    saveTemplateFromExpense(name, description, frequency, expenseData);
    document.body.removeChild(modal);
  };
}

// Save template from expense data
function saveTemplateFromExpense(name, description, frequency, expenseData) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'createTemplateFromExpense',
      name: name,
      description: description,
      frequency: frequency,
      expenseData: expenseData
    }, (response) => {
      if (response && response.template) {
        // Save the template
        chrome.tabs.sendMessage(tab.id, { 
          action: 'saveTemplate',
          template: response.template
        }, (saveResponse) => {
          if (saveResponse && saveResponse.success) {
            alert('Template saved successfully!');
          } else {
            alert('Error saving template: ' + (saveResponse?.error || 'Unknown error'));
          }
        });
      } else {
        alert('Error creating template: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Select template for expense creation (legacy function - used in template management)
function selectTemplate(templateId) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'getTemplate',
      templateId: templateId
    }, (response) => {
      if (response && response.template) {
        // Convert template to expense payload
        chrome.tabs.sendMessage(tab.id, { 
          action: 'templateToExpensePayload',
          template: response.template,
          overrides: {
            date: new Date().toISOString()
          }
        }, (payloadResponse) => {
          if (payloadResponse && payloadResponse.payload) {
            renderStep3FromTemplate(response.template, payloadResponse.payload);
          } else {
            alert('Error converting template to expense: ' + (payloadResponse?.error || 'Unknown error'));
          }
        });
      } else {
        alert('Error loading template: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Select template for workflow (new enhanced function)
function selectTemplateForWorkflow(templateId) {
  console.log('🔵 selectTemplateForWorkflow called with templateId:', templateId);
  console.log('🔵 Starting template selection workflow...');
  
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      console.error('❌ No active tab found');
      alert('No active tab found');
      return;
    }

    console.log('🔵 Active tab found:', tab.id, 'URL:', tab.url);

    // Show loading state
    const listDiv = document.getElementById('templatesList');
    if (!listDiv) {
      console.error('❌ templatesList element not found');
      alert('UI Error: templatesList element not found');
      return;
    }
    
    console.log('🔵 Setting loading state...');
    listDiv.innerHTML = '<div style="text-align: center; margin: 20px 0;">⏳ Loading template...</div>';

    console.log('🔵 Sending getTemplate message to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id, { 
      action: 'getTemplate',
      templateId: templateId
    }, (response) => {
      console.log('🔵 getTemplate response received:', response);
      
      if (chrome.runtime.lastError) {
        console.error('❌ Chrome runtime error during getTemplate:', chrome.runtime.lastError);
        alert('Chrome extension error: ' + chrome.runtime.lastError.message);
        loadTemplateSelectionList();
        return;
      }

      if (response && response.template) {
        console.log('✅ Template loaded successfully:', response.template.name);
        console.log('🔵 Converting template to expense payload...');
        
        // Convert template to expense payload
        chrome.tabs.sendMessage(tab.id, { 
          action: 'templateToExpensePayload',
          template: response.template,
          overrides: {
            date: new Date().toISOString()
          }
        }, (payloadResponse) => {
          console.log('🔵 templateToExpensePayload response received:', payloadResponse);
          
          if (chrome.runtime.lastError) {
            console.error('❌ Chrome runtime error during templateToExpensePayload:', chrome.runtime.lastError);
            alert('Chrome extension error: ' + chrome.runtime.lastError.message);
            loadTemplateSelectionList();
            return;
          }

          if (payloadResponse && payloadResponse.payload) {
            console.log('✅ Template converted to expense payload successfully');
            console.log('🔵 Rendering Step 3 from template...');
            renderStep3FromTemplate(response.template, payloadResponse.payload);
          } else {
            console.error('❌ Error converting template to expense:', payloadResponse?.error || 'Unknown error');
            alert('Error converting template to expense: ' + (payloadResponse?.error || 'Unknown error'));
            // Restore template list on error
            loadTemplateSelectionList();
          }
        });
      } else {
        console.error('❌ Error loading template:', response?.error || 'No template in response');
        alert('Error loading template: ' + (response?.error || 'Unknown error'));
        // Restore template list on error
        loadTemplateSelectionList();
      }
    });
  });
}

// Render Step 3 from template
function renderStep3FromTemplate(template, expensePayload) {
  console.log('🔵 renderStep3FromTemplate called with template:', template.name);
  console.log('🔵 expensePayload:', expensePayload);
  
  try {
    inner.innerHTML = `
      <h2>Step 3: Expense from Template</h2>
      <div style="margin-bottom: 20px;">
        <button id="backToTemplatesBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">← Back to Templates</button>
      </div>
      <div id="templateExpenseDetails">
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007cba;">
          <h3 style="margin-top: 0; color: #007cba;">Template: ${template.name}</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
            <div>
              <p style="margin: 5px 0;"><strong>Description:</strong> ${template.description || 'No description'}</p>
              <p style="margin: 5px 0;"><strong>Frequency:</strong> ${template.frequency.charAt(0).toUpperCase() + template.frequency.slice(1)}</p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Amount:</strong> $${template.expenseData.merchantAmount}</p>
              <p style="margin: 5px 0;"><strong>Merchant:</strong> ${template.expenseData.merchant.name}</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <button id="editTemplateBtn" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9em;">Edit Template</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>Expense Details</h3>
          <p style="color: #666; margin-bottom: 15px;">Review and modify the expense details below, then create the expense.</p>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button id="createFromTemplateBtn" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Create Expense</button>
            <button id="saveAsNewTemplateBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Save as New Template</button>
          </div>
        </div>
        
        <div>
          <h4>Expense Data Preview</h4>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
            <pre style="white-space:pre-wrap; font-size: 0.9em; margin: 0; color: #495057;">${JSON.stringify(expensePayload, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;

    console.log('✅ Step 3 HTML rendered successfully');

    // Add event listeners with error handling
    const createBtn = document.getElementById('createFromTemplateBtn');
    const editBtn = document.getElementById('editTemplateBtn');
    const saveBtn = document.getElementById('saveAsNewTemplateBtn');
    const backBtn = document.getElementById('backToTemplatesBtn');

    if (createBtn) {
      createBtn.onclick = () => {
        console.log('🔵 Create Expense button clicked');
        createExpenseFromData(expensePayload);
      };
    } else {
      console.error('❌ createFromTemplateBtn not found');
    }

    if (editBtn) {
      editBtn.onclick = () => {
        console.log('🔵 Edit Template button clicked');
        editTemplate(template.id);
      };
    } else {
      console.error('❌ editTemplateBtn not found');
    }

    if (saveBtn) {
      saveBtn.onclick = () => {
        console.log('🔵 Save as New Template button clicked');
        showSaveTemplateModal(expensePayload);
      };
    } else {
      console.error('❌ saveAsNewTemplateBtn not found');
    }

    if (backBtn) {
      backBtn.onclick = () => {
        console.log('🔵 Back to Templates button clicked');
        renderStep2_5_TemplateSelection();
      };
    } else {
      console.error('❌ backToTemplatesBtn not found');
    }

    console.log('✅ All event listeners attached successfully');
  } catch (error) {
    console.error('❌ Error in renderStep3FromTemplate:', error);
    alert('Error rendering Step 3: ' + error.message);
  }
}

// Edit template
function editTemplate(templateId) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'getTemplate',
      templateId: templateId
    }, (response) => {
      if (response && response.template) {
        showEditTemplateModal(response.template);
      } else {
        alert('Error loading template: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Show edit template modal
function showEditTemplateModal(template) {
  const modal = document.createElement('div');
  modal.id = 'editTemplateModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%;">
      <h3 style="margin-top: 0;">Edit Template</h3>
      <form id="editTemplateForm">
        <div style="margin-bottom: 15px;">
          <label for="editTemplateName" style="display: block; margin-bottom: 5px;">Template Name:</label>
          <input type="text" id="editTemplateName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" value="${template.name}">
        </div>
        <div style="margin-bottom: 15px;">
          <label for="editTemplateDescription" style="display: block; margin-bottom: 5px;">Description:</label>
          <textarea id="editTemplateDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" rows="3">${template.description || ''}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="editTemplateFrequency" style="display: block; margin-bottom: 5px;">Frequency:</label>
          <select id="editTemplateFrequency" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
            <option value="monthly" ${template.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="weekly" ${template.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
            <option value="quarterly" ${template.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
            <option value="yearly" ${template.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
            <option value="custom" ${template.frequency === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="cancelEditTemplate" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
          <button type="submit" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('cancelEditTemplate').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('editTemplateForm').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('editTemplateName').value;
    const description = document.getElementById('editTemplateDescription').value;
    const frequency = document.getElementById('editTemplateFrequency').value;
    
    updateTemplate(template.id, name, description, frequency);
    document.body.removeChild(modal);
  };
}

// Update template
function updateTemplate(templateId, name, description, frequency) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'getTemplate',
      templateId: templateId
    }, (response) => {
      if (response && response.template) {
        const updatedTemplate = {
          ...response.template,
          name: name,
          description: description,
          frequency: frequency
        };

        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateTemplate',
          templateId: templateId,
          templateData: updatedTemplate
        }, (updateResponse) => {
          if (updateResponse && updateResponse.success) {
            alert('Template updated successfully!');
            loadTemplatesList(); // Refresh the list
          } else {
            alert('Error updating template: ' + (updateResponse?.error || 'Unknown error'));
          }
        });
      } else {
        alert('Error loading template: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Delete template
function deleteTemplate(templateId) {
  if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) {
        alert('No active tab found');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { 
        action: 'deleteTemplate',
        templateId: templateId
      }, (response) => {
        if (response && response.success) {
          alert('Template deleted successfully!');
          loadTemplatesList(); // Refresh the list
        } else {
          alert('Error deleting template: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }
}

// Template management interface
function renderTemplateManagement() {
  const contentDiv = document.getElementById('methodContent');
  if (!contentDiv) {
    console.error('methodContent element not found');
    return;
  }
  contentDiv.innerHTML = `
    <h3>Template Management</h3>
    <div id="templateManagementList">Loading templates...</div>
    <div style="margin-top: 20px;">
      <button id="addNewTemplateBtn" style="margin-right: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Add New Template</button>
      <button id="exportTemplatesBtn" style="margin-right: 10px; padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer;">Export Templates</button>
      <button id="importTemplatesBtn" style="margin-right: 10px; padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 3px; cursor: pointer;">Import Templates</button>
      <button id="backToTemplateSelectionBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Back</button>
    </div>
  `;

  // Load templates for management
  loadTemplateManagementList();

  // Add event listeners
  document.getElementById('addNewTemplateBtn').onclick = () => {
    alert('To create a new template, complete a manual expense entry and click "Save as Template".');
  };

  document.getElementById('exportTemplatesBtn').onclick = () => {
    exportTemplates();
  };

  document.getElementById('importTemplatesBtn').onclick = () => {
    showImportTemplatesModal();
  };

  document.getElementById('backToTemplateSelectionBtn').onclick = () => {
    renderStep2_5_TemplateSelection();
  };
}

// Load templates for management
function loadTemplateManagementList() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      document.getElementById('templateManagementList').innerHTML = '<div style="color: red;">No active tab found.</div>';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'getAllTemplates' }, (response) => {
      const listDiv = document.getElementById('templateManagementList');
      
      if (response && response.templates) {
        const templates = response.templates;
        
        if (templates.length === 0) {
          listDiv.innerHTML = `
            <div style="text-align: center; color: #666; margin: 20px 0;">
              <p>No templates found.</p>
            </div>
          `;
        } else {
          listDiv.innerHTML = `
            <div style="display: grid; gap: 15px; margin-top: 10px;">
              ${templates.map(template => `
                <div class="template-management-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <h4 style="margin: 0 0 8px 0; color: #333;">${template.name}</h4>
                      <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9em;">${template.description || 'No description'}</p>
                      <div style="font-size: 0.85em; color: #999; margin-bottom: 8px;">
                        <div>Amount: $${template.expenseData.merchantAmount} | Frequency: ${template.frequency}</div>
                        <div>Merchant: ${template.expenseData.merchant.name}</div>
                        <div>Created: ${new Date(template.createdAt).toLocaleDateString()}</div>
                        <div>Updated: ${new Date(template.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style="margin-left: 15px;">
                      <button onclick="editTemplate('${template.id}')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; display: block; margin-bottom: 5px;">Edit</button>
                      <button onclick="deleteTemplate('${template.id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; display: block;">Delete</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      } else {
        listDiv.innerHTML = `<div style="color: red;">Error loading templates: ${response?.error || 'Unknown error'}</div>`;
      }
    });
  });
}

// Export templates
function exportTemplates() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'exportTemplates' }, (response) => {
      if (response && response.exportData) {
        const blob = new Blob([response.exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-templates-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Error exporting templates: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Show import templates modal
function showImportTemplatesModal() {
  const modal = document.createElement('div');
  modal.id = 'importTemplatesModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%;">
      <h3 style="margin-top: 0;">Import Templates</h3>
      <div style="margin-bottom: 15px;">
        <label for="importFile" style="display: block; margin-bottom: 5px;">Select template file:</label>
        <input type="file" id="importFile" accept=".json" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label>
          <input type="checkbox" id="overwriteExisting" style="margin-right: 8px;">
          Overwrite existing templates with same ID
        </label>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="cancelImport" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
        <button type="button" id="importTemplatesBtn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Import</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('cancelImport').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('importTemplatesBtn').onclick = () => {
    const fileInput = document.getElementById('importFile');
    const overwrite = document.getElementById('overwriteExisting').checked;
    
    if (!fileInput.files[0]) {
      alert('Please select a file to import');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonData = e.target.result;
      importTemplates(jsonData, { overwrite });
      document.body.removeChild(modal);
    };
    reader.readAsText(fileInput.files[0]);
  };
}

// Import templates
function importTemplates(jsonData, options = {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      alert('No active tab found');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'importTemplates',
      jsonData: jsonData,
      options: options
    }, (response) => {
      if (response && response.result) {
        const result = response.result;
        let message = `Import completed!\n`;
        message += `Success: ${result.success}\n`;
        message += `Failed: ${result.failed}\n`;
        message += `Skipped: ${result.skipped}`;
        
        if (result.errors && result.errors.length > 0) {
          message += `\n\nErrors:\n${result.errors.join('\n')}`;
        }
        
        alert(message);
        loadTemplateManagementList(); // Refresh the list
      } else {
        alert('Error importing templates: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// Modal utility functions
function showLoadingModal(message) {
  const modal = document.createElement('div');
  modal.id = 'loadingModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 8px; width: 300px; text-align: center;">
      <div style="font-size: 2em; margin-bottom: 15px;">⏳</div>
      <h3 style="margin: 0 0 10px 0; color: #333;">${message}</h3>
      <p style="margin: 0; color: #666;">Please wait...</p>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function hideLoadingModal(modal) {
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }
}

function showSuccessModal(title, data) {
  const modal = document.createElement('div');
  modal.id = 'successModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  `;

  const expenseId = data?.guid || data?.id || 'Unknown';
  const expenseAmount = data?.amount || data?.merchantAmount || 'N/A';
  const expenseMerchant = data?.merchant?.name || 'N/A';

  modal.innerHTML = `
    <div style="background: white; padding: 25px; border-radius: 8px; width: 400px; max-width: 90%;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 3em; color: #28a745; margin-bottom: 10px;">✅</div>
        <h3 style="margin: 0 0 10px 0; color: #28a745;">${title}</h3>
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">Expense Details</h4>
        <p style="margin: 5px 0; color: #666;"><strong>ID:</strong> ${expenseId}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Amount:</strong> $${expenseAmount}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Merchant:</strong> ${expenseMerchant}</p>
      </div>
      
      <div style="text-align: center;">
        <button id="closeSuccessModal" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Close</button>
        <button id="createAnotherExpense" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Create Another</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('closeSuccessModal').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('createAnotherExpense').onclick = () => {
    document.body.removeChild(modal);
    renderStep2();
  };
}

function showErrorModal(message) {
  const modal = document.createElement('div');
  modal.id = 'errorModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 25px; border-radius: 8px; width: 400px; max-width: 90%;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 3em; color: #dc3545; margin-bottom: 10px;">❌</div>
        <h3 style="margin: 0 0 15px 0; color: #dc3545;">Error</h3>
        <p style="margin: 0; color: #666; line-height: 1.4;">${message}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">Troubleshooting</h4>
        <ul style="margin: 0; padding-left: 20px; color: #666;">
          <li>Ensure you are logged into Navan</li>
          <li>Check your internet connection</li>
          <li>Verify the expense data is valid</li>
          <li>Try refreshing the page and trying again</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <button id="closeErrorModal" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Close</button>
        <button id="tryAgainError" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">Try Again</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  document.getElementById('closeErrorModal').onclick = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('tryAgainError').onclick = () => {
    document.body.removeChild(modal);
    // User can try again from current state
  };
}

// Create expense from data (enhanced API integration)
function createExpenseFromData(expenseData) {
  console.log('Creating expense from data:', expenseData);
  
  // Show loading state
  const loadingModal = showLoadingModal('Creating expense...');
  
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      hideLoadingModal(loadingModal);
      showErrorModal('No active tab found. Please ensure you are on the Navan website.');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { 
      action: 'createExpense',
      expenseData: expenseData
    }, (response) => {
      hideLoadingModal(loadingModal);
      
      if (response && response.success) {
        showSuccessModal('Expense created successfully!', response.data);
      } else {
        const errorMessage = response?.error || 'Unknown error occurred';
        showErrorModal('Failed to create expense: ' + errorMessage);
      }
    });
  });
}

// Test content script connection
function testContentScript() {
  console.log('🔵 Testing content script connection...');
  
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      console.error('❌ No active tab found');
      alert('No active tab found');
      return;
    }

    console.log('🔵 Active tab:', tab.id, tab.url);
    
    // Test basic message passing
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Content script not responding:', chrome.runtime.lastError);
        alert('Content script error: ' + chrome.runtime.lastError.message + '\n\nTry refreshing the page first.');
        return;
      }
      
      if (response) {
        console.log('✅ Content script responded:', response);
        alert('Content script is working! Response: ' + JSON.stringify(response));
      } else {
        console.error('❌ Content script returned empty response');
        alert('Content script returned empty response. Check if you\'re on the correct website.');
      }
    });
  });
}

// Start the flow
renderStep1();

// document.getElementById('openSite').onclick = async function() {
//   const platform = document.getElementById('platform').value;
//   const url = platformUrls[platform];
//   const statusDiv = document.getElementById('status');
//   const spinner = document.getElementById('spinner');
//   statusDiv.textContent = "Opening site and waiting for sign-in...";
//   spinner.style.display = "block";

//   // Open the platform in the current tab
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   chrome.tabs.update(tab.id, { url }, () => {
//     chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
//       if (updatedTabId === tab.id && info.status === 'complete') {
//         chrome.tabs.onUpdated.removeListener(listener);
//         // Programmatically inject content.js
//         chrome.scripting.executeScript({
//           target: { tabId: tab.id },
//           files: ['content.js']
//         }, () => {
//           // Now it's safe to send a message to the content script
//           chrome.tabs.sendMessage(tab.id, { action: 'getSampledExpenses' }, (response) => {
//             if (response && response.ready) {
//               spinner.style.display = "none";
//               statusDiv.textContent = "Select the expense report you want to automate:";
//               const optionsDiv = document.getElementById('expenseOptions');
//               optionsDiv.innerHTML = `
//                 <label><input type="radio" name="expenseType" value="Phone" checked> Phone</label><br>
//                 <label><input type="radio" name="expenseType" value="Internet"> Internet</label><br>
//                 <button id="submitExpenseType">Continue</button>
//               `;
//               document.getElementById('submitExpenseType').onclick = () => {
//                 const selectedType = document.querySelector('input[name="expenseType"]:checked').value;
//                 statusDiv.textContent = `You selected: ${selectedType}. Automating...`;
//                 chrome.tabs.sendMessage(tab.id, { action: 'fetchExpense', expenseType: selectedType }, (fetchResp) => {
//                   if (fetchResp?.data) {
//                     alert('Expense details fetched! Check console for data.');
//                     console.log(fetchResp.data);
//                   } else {
//                     alert('Failed to fetch expense.');
//                   }
//                 });
//               };
//             }
//           });
//         });
//       }
//     });
//   });
// };

// // sidepanel.js
// // chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
// //   chrome.tabs.sendMessage(tab.id, { action: 'fetchTransactions' }, (response) => {
// //     // Use response.transactions to update your UI
// //   });
// // });