
/*  content.js — minimal working version  */
console.log('[AutoScribe] content script loaded');

let typing = false;
let textToType = '';
let wpm = 60;
let index = 0;
let timer = null;

/* ---------- helpers ---------- */
const delay = () => {
  const cps = (wpm * 5) / 60;          // "5 chars per word" rule
  return 1000 / cps * (0.8 + Math.random() * 0.4);
};

function getTextarea() {
  // Docs keeps the real editable surface in a textarea inside the canvas
  return document.querySelector('.docs-textarea') ||
         document.querySelector('[contenteditable="true"]');
}

function typeNext() {
  if (!typing || index >= textToType.length) {
    typing = false;
    chrome.runtime.sendMessage({ done: true });
    return;
  }

  const ta = getTextarea();
  if (!ta) return;               // should not happen

  const ch = textToType[index++];
  const data = { inputType: 'insertText', data: ch };

  // send the events Docs expects
  ta.dispatchEvent(new InputEvent('beforeinput', data));
  ta.value += ch;
  ta.dispatchEvent(new InputEvent('input', data));
  ta.dispatchEvent(new Event('change', { bubbles: true }));

  timer = setTimeout(typeNext, delay());
}

/* ---------- message handling ---------- */
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'start') {
    if (typing) return respond({ ok: false, error: 'already running' });

    textToType = msg.text;
    wpm = msg.wpm || 60;
    index = 0;
    typing = true;

    // ensure the textarea exists
    const wait = setInterval(() => {
      if (getTextarea()) {
        clearInterval(wait);
        typeNext();
      }
    }, 200);
    return respond({ ok: true });
  }

  if (msg.action === 'stop') {
    clearTimeout(timer);
    typing = false;
    return respond({ ok: true });
  }

  if (msg.action === 'pause') {
    clearTimeout(timer);
    return respond({ ok: true });
  }

  if (msg.action === 'resume') {
    if (typing) {
      typeNext();
    }
    return respond({ ok: true });
  }

  if (msg.action === 'ping') {
    return respond({ pong: true });
  }
});

function findGoogleDocsEditor() {
  console.log('Searching for Google Docs editor...');
  
  if (!document.querySelector('.kix-appview-editor')) {
    console.log('Google Docs editor not yet loaded, waiting...');
    return null;
  }
  
  const selectors = [
    '.kix-appview-editor',
    '[contenteditable="true"][role="textbox"]',
    '.kix-lineview-content',
    '.kix-appview-editor-content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found editor element with selector:', selector, element);
      return element;
    }
  }
  
  console.log('No suitable editor found');
  return null;
}

function calculateDelay(wpm) {
    
  // WPM = words per minute, so we need to convert to characters per second
  const charsPerSecond = (wpm * 5) / 60;
  const delayMs = 1000 / charsPerSecond;
  
  // some randomness in the code
  const variation = 0.8 + (Math.random() * 0.4);
  return delayMs * variation;
}

// focusing on the position of the cursor in docs
function focusEditor(editor) {
  console.log('Focusing editor:', editor);
  
  try {
    editor.focus();
    
    const range = document.createRange();
    const selection = window.getSelection();
    
    selection.removeAllRanges();
    
    if (editor.childNodes.length > 0) {
      const lastNode = editor.childNodes[editor.childNodes.length - 1];
      if (lastNode.nodeType === Node.TEXT_NODE) {
        range.setStart(lastNode, lastNode.textContent.length);
        range.setEnd(lastNode, lastNode.textContent.length);
      } else {
        range.setStartAfter(lastNode);
        range.setEndAfter(lastNode);
      }
    } else {
      range.setStart(editor, 0);
      range.setEnd(editor, 0);
    }

    selection.addRange(range);
    
    const rect = editor.getBoundingClientRect();
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true
    });
    
    editor.dispatchEvent(clickEvent);
    
    console.log('Editor focused and cursor positioned');
  } catch (error) {
    console.error('Error focusing editor:', error);
  }
}

function typeCharacter(editor, char) {
  console.log('Attempting to type character:', char);
  
  try {
    // Focus the editor first
    editor.focus();
    
    // Method 1: Try to use execCommand (works in some cases)
    try {
      const success = document.execCommand('insertText', false, char);
      console.log('execCommand result:', success);
      if (success) {
        console.log('Text inserted via execCommand');
        return;
      }
    } catch (e) {
      console.log('execCommand failed:', e);
    }
    
    // method 2: use the selection API to insert text at the cursor position
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      const textNode = document.createTextNode(char);
      
      // insert the text
      range.insertNode(textNode);
      
      // move cursor after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      
      // update selection
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('Text inserted via selection API');
    }
    
    // Method 3: Creates \ comprehensive input events that Google Docs should recognize
    const textArea = document.querySelector('.kix-lineview-content') ||
                    document.querySelector('[contenteditable="true"][role="textbox"]') ||
                    document.querySelector('.kix-appview-editor-content') ||
                    editor;
    
    const inputEvent = new InputEvent('input', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    textArea.dispatchEvent(beforeInputEvent);
    textArea.dispatchEvent(inputEvent);
    
    // Method 4: Try keyboard events as a fallback
    const keyCode = char.charCodeAt(0);
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    textArea.dispatchEvent(keydownEvent);
    textArea.dispatchEvent(keypressEvent);
    textArea.dispatchEvent(keyupEvent);
    
    console.log('Character typing completed');
  } catch (error) {
    console.error('Error typing character:', error);
  }
}

// ain typing function
function typeNextCharacter() {
  console.log('typeNextCharacter called, state:', typingState);
  
  if (!typingState.isTyping || typingState.isPaused) {
    console.log('Typing stopped or paused');
    return;
  }
  
  if (typingState.currentIndex >= typingState.text.length) {
    // Finished typing
    console.log('Finished typing all characters');
    typingState.isTyping = false;
    typingState.currentIndex = 0;
    return;
  }
  
  const editor = findGoogleDocsEditor();
  if (!editor) {
    console.error('Could not find Google Docs editor');
    return;
  }
  
  const char = typingState.text[typingState.currentIndex];
  console.log('Typing character:', char, 'at index:', typingState.currentIndex);
  typeCharacter(editor, char);
  typingState.currentIndex++;
  
  // Schedule next character
  const delay = calculateDelay(typingState.wpm);
  console.log('Next character in', delay, 'ms');
  typingState.timeoutId = setTimeout(typeNextCharacter, delay);
}

// Start typing
function startTyping(text, wpm) {
  console.log('Starting typing with text:', text, 'WPM:', wpm);
  
  // Wait a bit for Google Docs to be ready
  setTimeout(() => {
    const editor = findGoogleDocsEditor();
    if (!editor) {
      console.error('No editor found');
      return { error: 'Could not find Google Docs editor. Please make sure you are on a Google Docs page.' };
    }
    
    console.log('Found editor:', editor);
    
    // Stop any existing typing
    stopTyping();
    
    // Initialize typing state
    typingState = {
      isTyping: true,
      isPaused: false,
      text: text,
      currentIndex: 0,
      wpm: wpm,
      timeoutId: null
    };
    
    console.log('Typing state initialized:', typingState);
    
    // Focus the editor
    focusEditor(editor);
    
    // Start typing
    typeNextCharacter();
  }, 1000); // Wait 1 second for Google Docs to be ready
  
  return { success: true };
}

// Pause typing
function pauseTyping() {
  if (typingState.isTyping && !typingState.isPaused) {
    typingState.isPaused = true;
    if (typingState.timeoutId) {
      clearTimeout(typingState.timeoutId);
      typingState.timeoutId = null;
    }
  }
}

// Resume typing
function resumeTyping() {
  if (typingState.isTyping && typingState.isPaused) {
    typingState.isPaused = false;
    typeNextCharacter();
  }
}

// Stop typing
function stopTyping() {
  if (typingState.timeoutId) {
    clearTimeout(typingState.timeoutId);
  }
  typingState = {
    isTyping: false,
    isPaused: false,
    text: '',
    currentIndex: 0,
    wpm: 60,
    timeoutId: null
  };
}

// Setup message listener
function setupMessageListener() {
  console.log('Setting up message listener...');
  
  // Check if Chrome APIs are available
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
    console.error('Chrome APIs not available in content script');
    return;
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    switch (request.action) {
      case 'ping':
        console.log('Ping received, responding with pong');
        sendResponse({ message: 'pong', timestamp: Date.now() });
        break;
        
      case 'start':
        const result = startTyping(request.text, request.wpm);
        sendResponse(result);
        break;
        
      case 'pause':
        pauseTyping();
        sendResponse({ success: true });
        break;
        
      case 'resume':
        resumeTyping();
        sendResponse({ success: true });
        break;
        
      case 'stop':
        stopTyping();
        sendResponse({ success: true });
        break;
        
      case 'status':
        sendResponse({ isTyping: typingState.isTyping });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
    
    return true; // Keep message channel open for async response
  });
  
  console.log('Message listener setup complete');
}

// Initialize the content script
console.log('Character-by-Character Text Input content script loaded');

// Setup message listener immediately
setupMessageListener();

// Add a simple test to verify the content script is working
window.addEventListener('load', () => {
  console.log('Page fully loaded, content script is active');
  
  // Test if we can find the Google Docs editor
  const editor = findGoogleDocsEditor();
  if (editor) {
    console.log('âœ… Google Docs editor found:', editor);
  } else {
    console.log('âŒ Google Docs editor not found');
  }
}); 