// background.js
console.log('AutoScribe background script loaded');

// Listen for tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Page loaded, checking content script...');
    
    // Wait a bit for the page to fully load
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not responding, will inject when needed');
        } else {
          console.log('Content script is already active');
        }
      });
    }, 2000); // Reduced wait time for faster response
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
  return true; // Keep message channel open
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('AutoScribe extension installed/updated');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('AutoScribe extension started');
});