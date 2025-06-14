// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetchExpense') {
    const guid = msg.guid || '78b0391e-87d0-44fc-92cb-708e38d9d382';
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


(async function() {
  const guid = '78b0391e-87d0-44fc-92cb-708e38d9d382'; 
  //const guid // or extract dynamically
  const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
  const token = window.localStorage.getItem('NVN_REMOTES'); 
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include', // ensures cookies/session are sent
    headers: {
      'Accept': 'application/json',
      'Authorization': token ? `TripActions ${token}` : '', 
    }
  });
  const data = await response.json();
  console.log('API response from CHROME Extension Expensabl:', data);
})();