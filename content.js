
/*  content.js — AutoScribe Chrome Extension  */
console.log('[AutoScribe] content script loaded');

// Prevent duplicate injections
if (typeof window.autoScribeLoaded !== 'undefined') {
  console.log('AutoScribe content script already loaded, skipping...');
} else {
  console.log('AutoScribe content script loaded');
  window.autoScribeLoaded = true;
  
  // Global state management - only declare once
  if (typeof window.autoScribeTypingState === 'undefined') {
    window.autoScribeTypingState = {
      isTyping: false,
      isPaused: false,
      text: '',
      currentIndex: 0,
      wpm: 60,
      timeoutId: null
    };
  }
  
  /* ---------- helper functions ---------- */
  function calculateDelay(wpm) {
    // WPM = words per minute, so we need to convert to characters per second
    const charsPerSecond = (wpm * 5) / 60;
    const delayMs = 1000 / charsPerSecond;
    
    // Add some randomness to make it more human-like
    const variation = 0.8 + (Math.random() * 0.4);
    return delayMs * variation;
  }
  
  function findGoogleDocsEditor() {
    console.log('Searching for Google Docs editor...');
    
    // Wait for Google Docs to load
    if (!document.querySelector('.kix-appview-editor')) {
      console.log('Google Docs editor not yet loaded');
      return null;
    }
    
    const selectors = [
      '.kix-appview-editor',
      '[contenteditable="true"][role="textbox"]',
      '.kix-lineview-content',
      '.kix-appview-editor-content',
      '.docs-textarea',
      '.kix-appview-editor-content .kix-lineview-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Found editor element with selector:', selector);
        return element;
      }
    }
    
    // Try to find the main editor container
    const editorContainer = document.querySelector('.kix-appview-editor');
    if (editorContainer) {
      console.log('Found editor container, using it directly');
      return editorContainer;
    }
    
    console.log('No suitable editor found');
    return null;
  }
  
  function focusEditor(editor) {
    console.log('Focusing editor');
    
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
      
      // Simulate a click to ensure focus
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
    console.log('Typing character:', char);
    
    try {
      // Focus the editor first
      editor.focus();
      
      // Method 1: Try execCommand (works in some cases)
      try {
        const success = document.execCommand('insertText', false, char);
        if (success) {
          console.log('Text inserted via execCommand');
          return;
        }
      } catch (e) {
        console.log('execCommand failed:', e);
      }
      
      // Method 2: Use selection API
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(char);
        
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('Text inserted via selection API');
        return;
      }
      
      // Method 3: Try to find the actual textarea in Google Docs
      const textArea = document.querySelector('.kix-lineview-content') ||
                      document.querySelector('[contenteditable="true"][role="textbox"]') ||
                      document.querySelector('.kix-appview-editor-content') ||
                      document.querySelector('.docs-textarea') ||
                      editor;
      
      // Method 4: Try keyboard simulation
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
      
      // Method 5: Input events as fallback
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
      
      console.log('Character typing completed');
    } catch (error) {
      console.error('Error typing character:', error);
    }
  }
  
  /* ---------- main typing functions ---------- */
  function typeNextCharacter() {
    const typingState = window.autoScribeTypingState;
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
      chrome.runtime.sendMessage({ done: true });
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
      window.autoScribeTypingState = {
        isTyping: true,
        isPaused: false,
        text: text,
        currentIndex: 0,
        wpm: wpm,
        timeoutId: null
      };
      
      console.log('Typing state initialized:', window.autoScribeTypingState);
      
      // Focus the editor
      focusEditor(editor);
      
      // Start typing
      typeNextCharacter();
    }, 1000); // Wait 1 second for Google Docs to be ready
    
    return { success: true };
  }
  
  function pauseTyping() {
    const typingState = window.autoScribeTypingState;
    if (typingState.isTyping && !typingState.isPaused) {
      typingState.isPaused = true;
      if (typingState.timeoutId) {
        clearTimeout(typingState.timeoutId);
        typingState.timeoutId = null;
      }
    }
  }
  
  function resumeTyping() {
    const typingState = window.autoScribeTypingState;
    if (typingState.isTyping && typingState.isPaused) {
      typingState.isPaused = false;
      typeNextCharacter();
    }
  }
  
  function stopTyping() {
    const typingState = window.autoScribeTypingState;
    if (typingState.timeoutId) {
      clearTimeout(typingState.timeoutId);
    }
    window.autoScribeTypingState = {
      isTyping: false,
      isPaused: false,
      text: '',
      currentIndex: 0,
      wpm: 60,
      timeoutId: null
    };
  }
  
  /* ---------- message handling ---------- */
  // Only set up message listener once
  if (!window.autoScribeMessageListenerSet) {
    window.autoScribeMessageListenerSet = true;
    
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
          sendResponse({ isTyping: window.autoScribeTypingState.isTyping });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true; // Keep message channel open for async response
    });
    
    console.log('Message listener set up');
  }
  
  // Immediately notify that the script is loaded
  console.log('Content script initialization complete');
  
  // Add a simple test to verify the content script is working
  window.addEventListener('load', () => {
    console.log('Page fully loaded, content script is active');
    
    // Test if we can find the Google Docs editor
    const editor = findGoogleDocsEditor();
    if (editor) {
      console.log('✅ Google Docs editor found:', editor);
    } else {
      console.log('❌ Google Docs editor not found');
    }
  });
  
  // Also check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM content loaded, content script ready');
    });
  } else {
    console.log('DOM already loaded, content script ready');
  }
} 