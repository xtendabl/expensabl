document.getElementById('runNow').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(
    tab.id,
    { action: 'fetchExpense', guid: '78b0391e-87d0-44fc-92cb-708e38d9d382' },
    (response) => {
      if (response?.data) {
        console.log('API response from content.js:', response.data);
      } else {
        console.error('Error:', response?.error);
      }
    }
  );
});