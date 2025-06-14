chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    for (const header of details.requestHeaders) {
      if (header.name.toLowerCase() === 'Authorization' && header.value.startsWith('TripActions ')) {
        console.log('🛡️ Bearer Token Captured:', header.value);
        console.log('Do you see this???');
        // Optionally store it for later use
        //chrome.storage.local.set({ bearerToken: header.value });
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["https://app.navan.com/api/*"] },
  ["requestHeaders"]
);
