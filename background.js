console.log('Background script running...');
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    for (const header of details.requestHeaders) {
      if (header.name === 'Authorization' && header.value.startsWith('TripActions ')) {
        // console.log('🛡️ Bearer Token Captured:', header.value);
        // console.log('Do you see this???');
        // Optionally store it for later use
        chrome.storage.local.set({ bearerToken: header.value });
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["https://app.navan.com/api/*"] },
  ["requestHeaders"]
);

// // 1. Schedule the alarm on install
// chrome.runtime.onInstalled.addListener(() => {
//   console.log('Extension installed. Scheduling monthly alarm...');
//   scheduleMonthlyAlarm();
// });

// function scheduleMonthlyAlarm() {
//   console.log('Creating monthly alarm...');
//   chrome.alarms.create("monthlyAlarm", {
//     delayInMinutes: 1,  
//     periodInMinutes: 1        // First run after install
//     // periodInMinutes: 43200      // 30 days = 30*24*60 = 43,200 minutes
//   });
//   console.log('Monthly alarm scheduled.');
// }

// // 3. Alarm listener — alert or notify
// chrome.alarms.onAlarm.addListener((alarm) => {
//   console.log('Alarm triggered:', alarm);
//   if (alarm.name === "monthlyAlarm") {
//     console.log('Monthly alarm fired. Creating notification...');
//     chrome.notifications.create({
//       type: "basic",
//       iconUrl: "icon.png",
//       title: "Monthly Reminder",
//       message: "Don't forget to submit your expense report!",
//       priority: 2
//     }, (notificationId) => {
//       console.log('Notification created with ID:', notificationId);
//     });
//   }
// });