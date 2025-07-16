// content.js
async function getBearerToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('bearerToken', (result) => {
      if (result.bearerToken) resolve(result.bearerToken);
      else reject('No bearer token found.');
    });
  });
}

async function fetchWithBearer(url) {
  const token = await getBearerToken();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en",
      "authorization": token
    }
  });
  return res.json();
}

async function postExpenseWithBearer(url, payload) {
  const token = await getBearerToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en",
      "authorization": token,
      "content-type": "application/json",
      "x-timezone": "America/Los_Angeles"
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new Error(`API Error ${res.status}: ${errorData.message || errorData.error || 'Unknown error'}`);
  }
  
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.action === 'ping') {
        sendResponse({ status: 'pong', url: window.location.href, templateManagerLoaded: typeof TemplateManager !== 'undefined' });
      } else if (msg.action === 'fetchExpense') {
        const guid = msg.selectedTxn.id;
        const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      } else if (msg.action === 'getSampledExpenses') {
        const url = 'https://app.navan.com/api/liquid/user/search/transactions';
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      } else if (msg.action === 'saveTemplate') {
        const result = await TemplateManager.saveTemplate(msg.template);
        sendResponse({ success: result.success, templateId: result.templateId });
      } else if (msg.action === 'getTemplate') {
        const template = await TemplateManager.getTemplate(msg.templateId);
        sendResponse({ template });
      } else if (msg.action === 'getAllTemplates') {
        const templates = await TemplateManager.getAllTemplates();
        sendResponse({ templates });
      } else if (msg.action === 'updateTemplate') {
        const result = await TemplateManager.updateTemplate(msg.templateId, msg.templateData);
        sendResponse({ success: result.success, templateId: result.templateId });
      } else if (msg.action === 'deleteTemplate') {
        const result = await TemplateManager.deleteTemplate(msg.templateId);
        sendResponse({ success: result.success, templateId: result.templateId });
      } else if (msg.action === 'getStorageUsage') {
        const usage = await TemplateManager.getStorageUsage();
        sendResponse({ usage });
      } else if (msg.action === 'exportTemplates') {
        const exportData = await TemplateManager.exportTemplates();
        sendResponse({ exportData });
      } else if (msg.action === 'importTemplates') {
        const result = await TemplateManager.importTemplates(msg.jsonData, msg.options);
        sendResponse({ result });
      } else if (msg.action === 'createTemplateFromExpense') {
        const template = TemplateManager.createTemplate(
          msg.name,
          msg.description,
          msg.frequency,
          msg.expenseData
        );
        sendResponse({ template });
      } else if (msg.action === 'templateToExpensePayload') {
        const payload = TemplateManager.templateToExpensePayload(msg.template, msg.overrides);
        sendResponse({ payload });
      } else if (msg.action === 'createExpense') {
        const url = 'https://app.navan.com/api/liquid/user/expenses/manual';
        const apiResponse = await postExpenseWithBearer(url, msg.expenseData);
        sendResponse({ success: true, data: apiResponse });
      }
    } catch (error) {
      sendResponse({ error: error.toString() });
    }
  })();
  return true; // Keeps the message channel open for async sendResponse
});