// AutoScribe background script (MV2)
// Keeps the event page alive to receive messages and logs lifecycle events

console.log('[AutoScribe] background loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoScribe] extension installed');
});

// Simple message relay and health check
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'ping') {
    sendResponse({ message: 'pong', from: 'background', timestamp: Date.now() });
    return; // synchronous response
  }
});


