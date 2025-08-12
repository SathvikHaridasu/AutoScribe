// DOM elements
const inputText = document.getElementById('inputText');
const wpm = document.getElementById('wpm');
const wpmValue = document.getElementById('wpmValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const testBtn = document.getElementById('testBtn');
const errorDiv = document.getElementById('error');
const charCount = document.getElementById('charCount');

function showError(msg, isSuccess = false) {
  errorDiv.textContent = msg;
  errorDiv.className = isSuccess ? 'error success' : 'error';
  errorDiv.style.display = 'block';
}

function clearError() {
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';
}

wpm.addEventListener('input', () => {
  wpmValue.textContent = wpm.value;
});

inputText.addEventListener('input', () => {
  const length = inputText.value.length;
  charCount.textContent = length;
  
  if (length > 1000) {
    showError('Maximum 1000 characters allowed.');
    inputText.value = inputText.value.slice(0, 1000);
    charCount.textContent = '1000';
  } else if (/\n/.test(inputText.value)) {
    showError('No line breaks allowed.');
    inputText.value = inputText.value.replace(/\n/g, ' ');
  } else {
    clearError();
  }
});

function setButtons(state) {
  // state: 'idle', 'typing', 'paused'
  if (state === 'idle') {
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    document.body.classList.remove('typing');
  } else if (state === 'typing') {
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
    document.body.classList.add('typing');
  } else if (state === 'paused') {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    stopBtn.disabled = false;
    document.body.classList.remove('typing');
  }
}

setButtons('idle');

// Helper function to ensure content script is injected
async function ensureContentScriptInjected(tabId) {
  try {
    console.log('Checking if content script is available...');
    
    // First try to ping the content script
    try {
      const pingResponse = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      if (pingResponse && pingResponse.message === 'pong') {
        console.log('Content script is already available and responding');
        return true;
      }
    } catch (e) {
      console.log('Content script not responding, will inject:', e.message);
    }
    
    // If we get here, content script is not available, so inject it
    console.log('Injecting content script...');
    try {
      // Inject the content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log('Content script injection results:', results);
      
      // Wait a bit for the content script to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test if the injection worked
      const testResponse = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      if (testResponse && testResponse.message === 'pong') {
        console.log('Content script injected successfully and responding');
        return true;
      } else {
        console.error('Content script injected but not responding correctly:', testResponse);
        return false;
      }
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
      return false;
    }
    
  } catch (error) {
    console.error('Error in ensureContentScriptInjected:', error);
    return false;
  }
}

// Helper function to send message with retry
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}: Ensuring content script is injected...`);
      
      // Ensure content script is injected
      const injected = await ensureContentScriptInjected(tabId);
      if (!injected) {
        throw new Error('Failed to inject content script. Please refresh the page.');
      }
      
      // Send the message
      console.log(`Attempt ${i + 1}: Sending message:`, message);
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`Attempt ${i + 1} failed with runtime error:`, chrome.runtime.lastError);
            reject(new Error(`Runtime error: ${chrome.runtime.lastError.message}`));
          } else {
            console.log(`Attempt ${i + 1} succeeded with response:`, response);
            resolve(response);
          }
        });
      });
      
      // If we get here, the message was successful
      return response;
      
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        // This was the last attempt, throw the error
        throw error;
      }
      // Wait before retry
      console.log(`Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

startBtn.addEventListener('click', async () => {
  clearError();
  const text = inputText.value.trim();
  if (!text) {
    showError('Please enter some text.');
    return;
  }
  if (text.length > 1000) {
    showError('Maximum 1000 characters allowed.');
    return;
  }
  if (/\n/.test(text)) {
    showError('No line breaks allowed.');
    return;
  }
  
  console.log('Start button clicked, text:', text);
  showError('Starting typing...', true);
  
  try {
    // Check if on Google Docs
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    console.log('Current tab:', tab);
    
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showError('Please use this extension on a regular website.');
      return;
    }
    
    console.log('Sending message to content script...');
    const response = await sendMessageWithRetry(tab.id, {
      action: 'start',
      text,
      wpm: parseInt(wpm.value, 10)
    });
    
    console.log('Response from content script:', response);
    
    if (response && response.error) {
      showError(response.error);
      setButtons('idle');
      return;
    }
    
    if (response && response.success === false) {
      showError(response.error || 'Failed to start typing');
      setButtons('idle');
      return;
    }
    
    setButtons('typing');
    inputText.value = '';
    showError('Typing in progress...', true);
    
    // Set up a listener to detect when typing completes
    const checkCompletion = setInterval(async () => {
      try {
        const statusResponse = await sendMessageWithRetry(tab.id, {action: 'status'});
        if (statusResponse && !statusResponse.isTyping) {
          clearInterval(checkCompletion);
          setButtons('idle');
          showError('🎉 Typing completed!', true);
          setTimeout(clearError, 3000);
        }
      } catch (error) {
        clearInterval(checkCompletion);
        console.error('Error checking status:', error);
        setButtons('idle');
        showError('Typing completed or interrupted.', true);
        setTimeout(clearError, 3000);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Communication error:', error);
    const errorMessage = error.message || 'Unknown error';
    showError(`Could not communicate with content script: ${errorMessage}. Please refresh the page and try again.`);
    setButtons('idle');
  }
});

pauseBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'pause'});
    setButtons('paused');
    showError('Typing paused', true);
  } catch (error) {
    console.error('Error pausing:', error);
    showError('Failed to pause typing. Please try again.');
  }
});

resumeBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'resume'});
    setButtons('typing');
    showError('Typing resumed', true);
  } catch (error) {
    console.error('Error resuming:', error);
    showError('Failed to resume typing. Please try again.');
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    await sendMessageWithRetry(tab.id, {action: 'stop'});
    setButtons('idle');
    showError('Typing stopped', true);
    setTimeout(clearError, 2000);
  } catch (error) {
    console.error('Error stopping:', error);
    showError('Failed to stop typing. Please try again.');
  }
});

testBtn.addEventListener('click', async () => {
  console.log('Test button clicked');
  clearError();
  showError('Testing connection...', true);
  
  try {
    // First, check if we can access tabs
    console.log('Checking tab access...');
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    console.log('Current tab:', tab);
    
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showError('Please use this extension on a regular website.');
      return;
    }
    
    // Check if content script is available
    console.log('Testing content script availability...');
    const available = await ensureContentScriptInjected(tab.id);
          if (!available) {
        showError('Content script not available. Please refresh the page and try again.');
        return;
      }
    
    console.log('Sending ping to content script...');
    const response = await sendMessageWithRetry(tab.id, {action: 'ping'});
    
    console.log('Ping response:', response);
    
    if (response && response.message === 'pong') {
      console.log('✅ Content script is working!');
      showError('✅ Connection successful! Content script is working.', true);
      setTimeout(clearError, 2000);
    } else {
      showError(`Unexpected response from content script: ${JSON.stringify(response)}`);
    }
    
  } catch (error) {
    console.error('Ping failed:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('Error properties:', Object.getOwnPropertyNames(error));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Try to get more details about the error
    let errorDetails = 'Unknown error';
    if (error.message) {
      errorDetails = error.message;
    } else if (typeof error === 'string') {
      errorDetails = error;
    } else if (error && typeof error === 'object') {
      try {
        errorDetails = JSON.stringify(error);
      } catch (e) {
        errorDetails = error.toString();
      }
    }
    
    showError(`Content script not responding: ${errorDetails}. Please refresh the page and try again.`);
  }
}); 