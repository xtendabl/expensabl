// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('content.js received message:', msg);
  if (msg.action === 'fetchExpense') {
    // Extract GUID from URL dynamically
    const guidMatch = window.location.href.match(/[0-9a-fA-F-]{36}/);
    const guid = guidMatch ? guidMatch[0] : null;
    if (!guid) {
      sendResponse({ error: 'No GUID found in URL.' });
      return true;
    }
    const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
    const rawToken = localStorage.getItem('tripactions.TripActionsToken');
    const token = rawToken ? JSON.parse(rawToken) : null;
    fetch(url, {
      method: 'GET',
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en",
        "authorization": token ? `${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.toString() }));
    return true; // Keep the message channel open for async response
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
          console.log('Fetched data:', data);
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

// const token = (await chrome.storage.local.get('bearerToken')).bearerToken;
// if (!token) {
//   sendResponse({ error: 'No bearer token found.' });
//   return;
// }


// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.action === 'getSampledExpenses') {
//     fetch('https://app.navan.com/api/liquid/user/search/transactions', {
//       method: 'GET',
//       credentials: 'include',
//       headers: { 
//       'Accept': 'application/json, text/plain, */*"',
//       'Accept-Language': 'en',
//       'Authorization': token ? `${token}` : ''
//       }
//     })
//       .then(res => res.json())
//       .then(data => {
//       console.log(data);
//       sendResponse({ data });
//       })
//       .catch(error => {
//       sendResponse({ error: error.toString() });
//       });
//     return true; // Keeps the message channel open for async sendResponse
//   }
// });