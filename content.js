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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.action === 'fetchExpense') {
        const guid = msg.selectedTxn.id;
        const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      } else if (msg.action === 'getSampledExpenses') {
        const url = 'https://app.navan.com/api/liquid/user/search/transactions';
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      }
    } catch (error) {
      sendResponse({ error: error.toString() });
    }
  })();
  return true; // Keeps the message channel open for async sendResponse
});