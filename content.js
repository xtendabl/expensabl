// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
        "authorization": token ? `TripActions ${token}` : ''
      }
    })
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.toString() }));
    return true; // Keep the message channel open for async response
  }
});