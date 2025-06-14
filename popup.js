document.getElementById('runNow').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(
    tab.id,
    { action: 'fetchExpense' }, // No guid, let content.js determine it dynamically
    (response) => {
      if (response?.data) {
        console.log('API response from content.js:', response.data);
      } else {
        console.error('Error:', response?.error);
      }
    }
  );
});