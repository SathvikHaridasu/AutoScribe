// background.js
console.log('Background script loaded');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' &&
      tab.url && tab.url.startsWith('https://docs.google.com/document/')) {
    chrome.tabs.sendMessage(tabId, {action: 'ping'});
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  sendResponse({ received: true });
});