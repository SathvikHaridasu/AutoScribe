// background.js
console.log('Background script loaded');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://docs.google.com/document/')) {
    console.log('Google Docs page loaded, injecting content script...');

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      console.log('Content script injected successfully');

      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Content script not responding after injection:', chrome.runtime.lastError);
          } else {
            console.log('Content script is responding correctly');
          }
        });
      }, 1000);
    }).catch((error) => {
      console.error('Failed to inject content script:', error);
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  sendResponse({ received: true });
});