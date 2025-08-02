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
      } else if (msg.action === 'createExpense') {
        // Step 1: POST to create a new expense and get the GUID
        const token = await getBearerToken();
        const postRes = await fetch('https://app.navan.com/api/liquid/user/expenses/manual', {
          method: 'POST',
          headers: {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en",
            "authorization": token,
            "content-type": "application/json"
          },
          body: JSON.stringify(msg.postBody) // expects expense creation payload in msg.postBody
        });
        const postData = await postRes.json();
        const guid = postData.id || postData.guid || postData.expenseId; // adjust as needed
        if (!guid) throw new Error('No GUID returned from expense creation');

        // Step 2: PATCH to update the expense with additional info
        const patchRes = await fetch(`https://app.navan.com/api/liquid/user/expenses/${guid}`, {
          method: 'PATCH',
          headers: {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en",
            "authorization": token,
            "content-type": "application/json"
          },
          body: JSON.stringify(msg.patchBody) // expects expense update payload in msg.patchBody
        });
        const patchData = await patchRes.json();
        sendResponse({ guid, patchData });
      }
    } catch (error) {
      sendResponse({ error: error.toString() });
    }
  })();
  return true; // Keeps the message channel open for async sendResponse
});