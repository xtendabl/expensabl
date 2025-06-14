async function getExpensePolicyOptions() {
  const response = await fetch("https://app.navan.com/api/liquid/user/expenses/78b0391e-87d0-44fc-92cb-708e38d9d382", {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en",
      "authorization": "TripActions eyJhcHAtc2hhcmVkLXNpZGUtbmF2IjoiIiwiYXBwLXNoYXJlZC1uYXYiOiIiLCJhcHAtc2hhcmVkLWF1dGgiOiIiLCJhcHAtc2hhcmVkLXFwIjoiIiwiYXBwLXRyYXZlbC1hZG1pbi1hcHByb3ZhbHMiOiIiLCJhcHAtdHJhdmVsLWFkbWluLXJlcG9ydGluZyI6IiIsImFwcC1jb25maWd1cmF0aW9uLWZpZWxkcyI6IiJ9",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-timezone": "America/Los_Angeles",
      "cookie": "OptanonAlertBoxClosed=2025-03-15T12:25:26.042Z; __stripe_mid=dceec5f3-304c-47e6-a08f-433aa96e09a750b12c; Navan.49426168-b807-4b83-b550-61748e071260=true; __ssid=96a067882eb002227d11731dad6730b; G_ENABLED_IDPS=google; _cfuvid=v0GYviV69BWWHvTVGHGWEWqWYSrhFXlusNHP7dJxSNc-1749768240756-0.0.1.1-604800000; _gid=GA1.2.743363418.1749792327; _legacy_auth0.WkJ8oyxc9nkQ3cj91xjWH46tTSZ8HnTL.is.authenticated=true; auth0.WkJ8oyxc9nkQ3cj91xjWH46tTSZ8HnTL.is.authenticated=true; _ga=GA1.2.404435249.1743386784; _ga_5DVYGWG86S=GS2.1.s1749792326$o5$g1$t1749793491$j51$l0$h0; AMP_MKTG_222bb75b75=JTdCJTdE; OptanonConsent=isGpcEnabled=0&datestamp=Fri+Jun+13+2025+12%3A25%3A46+GMT-0700+(Pacific+Daylight+Time)&version=202401.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0%2CC0009%3A0&AwaitingReconsent=false&geolocation=US%3BCA; __stripe_sid=511536d4-3d96-4c7c-8a11-303da658f1ca028f85; __cf_bm=gCob3sTi1PLBaSb8vHP62Uc27gaASvJJzl9v0fWhh24-1749864247-1.0.1.1-jM.cJZuUlwhGAjBoPC_GSsz11yTAdERKWmDNWacnsPxFQW5GTndAT8xXhBvNHGxtZuAw9p.2LBTsdj3wnZsSe0qRzLcbjIFWAMIdpvS3o6o; cf_clearance=w0gH6EOQpil9kkQgvRtIhm7DxzGUMEl8yLsvFEIqp84-1749864563-1.2.1.1-U1xGPnftrBkN6.rAJUQuRG98L9f.OdMWmO4SBZ_LuR_sqR43Zt.Hl956T3E6Mp2gixMdtgPnkauKFzOVDgEvKsduxASjv4OdGqOGe9Pxu0BvIVRGBbAe4khgj2irUHPac1KXvpMBbnFX_Ni43PT5Pw6Wd6otn4ZkOqIJhwZHbsXFye5dJb6NUK2gfdGb7sGFZKf4POk4aYIv4QytPrTgNnHJlL0amT.6UWQe35WCr.KiVqXxUfOAbMr_1apiClNf2E9ER_TtLlpQHQBQy60aNSlB6BLum.cPdfTFe_dN4DEqUb7gry.xre7KhL6DNluCklTHa3f5ocYjIUbM2mmSuT1o7C7lYL8JjjwKYlzN.9U; AMP_222bb75b75=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjI5NzJkY2JkMS01MjQyLTQxYmYtOTczOC04NGM0NzViNzNmNzIlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJnaW8lNDBleHRlbmRhYmwuZGV2JTIyJTJDJTIyc2Vzc2lvbklkJTIyJTNBMTc0OTg2NDcxOTQ5NCUyQyUyMm9wdE91dCUyMiUzQWZhbHNlJTJDJTIybGFzdEV2ZW50VGltZSUyMiUzQTE3NDk4NjQ3MTk1ODklMkMlMjJsYXN0RXZlbnRJZCUyMiUzQTEzNjIlMkMlMjJwYWdlQ291bnRlciUyMiUzQTAlN0Q=; AWSALB=IhlxoQRrZNQs7MwyIzpJszl195r/qRHb2ez6/ou1pdySdUFZWWdjq5t4H47lGU7FjGkfQQezLS8HSqXcJnyrvxyFi3A6f+rYQPFLzdsN8LYPN5QvZu7+3BWJKXN/; AWSALBCORS=IhlxoQRrZNQs7MwyIzpJszl195r/qRHb2ez6/ou1pdySdUFZWWdjq5t4H47lGU7FjGkfQQezLS8HSqXcJnyrvxyFi3A6f+rYQPFLzdsN8LYPN5QvZu7+3BWJKXN/; AMP_TLDTEST=MQ==",
      "Referer": "https://app.navan.com/app/liquid/user/transactions/details-new/78b0391e-87d0-44fc-92cb-708e38d9d382",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    body: null,
    method: "GET"
  });
  return response.json();
}

getExpensePolicyOptions().then(data => {
  console.log(data);
});