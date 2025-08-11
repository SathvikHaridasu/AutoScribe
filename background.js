// background.js
console.log('AutoScribe background script loaded');

// Listen for tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' &&
      tab.url && tab.url.startsWith('https://docs.google.com/document/')) {
    console.log('Google Docs page loaded, checking content script...');
    chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not responding, will inject when needed');
      } else {
        console.log('Content script is already active');
      }
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.done) {
    console.log('Typing completed');
    // You could add notification here if needed
  }
  
  sendResponse({ received: true });
});