// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('content.js received message:', msg);
  if (msg.action === 'fetchExpense') {
    console.log('Handling fetchExpense action');
    chrome.storage.local.get('bearerToken', (result) => {
      const token = result.bearerToken;
      if (!token) {
        sendResponse({ error: 'No bearer token found.' });
        return;
      }
      console.log('Fetching fetchExpense with token:', token);
      const guid = msg.selectedTxn.id;
      const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
      fetch(url, {
        method: 'GET',
        headers: {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en",
          "authorization": token ? `${token}` : ''
        }
      })
      .then(res => res.json())
      .then(data => {
        console.log('Fetched expense data from transaction id:', data);
        sendResponse({ data });
      })
      .catch(error => sendResponse({ error: error.toString() }));
      return true; // Keep the message channel open for async response
    });
  }

  if (msg.action === 'getSampledExpenses') {
    console.log('Handling getSampledExpenses action');
    chrome.storage.local.get('bearerToken', (result) => {
      const token = result.bearerToken;
      if (!token) {
        sendResponse({ error: 'No bearer token found.' });
        return;
      }
      console.log('Fetching sampled expenses with token:', token);
      fetch('https://app.navan.com/api/liquid/user/search/transactions', {
        method: 'GET',
        headers: {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en",
          "authorization": token ? `${token}` : ''
        }
      })
        .then(res => {
          console.log('Fetch response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('Fetched data from transactions:', data);
          sendResponse({ data });
        })
        .catch(error => {
          console.error('Fetch error:', error);
          sendResponse({ error: error.toString() });
        });
      // No need for return true here, as chrome.storage callback is synchronous
    });
    return true; // Keep the message channel open for async response
  }
});