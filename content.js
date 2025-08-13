
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
      minWPM: 60,
      maxWPM: 80,
      timeoutId: null,
      targetElement: null,
      retryCountForIndex: 0
    };
  }

  // Track last active editable element outside of our GUI so we can resume reliably
  if (typeof window.autoScribeLastActiveInput === 'undefined') {
    window.autoScribeLastActiveInput = null;
  }

  function isInsideGUI(node) {
    return !!(node && (node.closest && node.closest('#autoScribeFloatingGUI')));
  }

  function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
    const isContentEditable = el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true';
    return (isInput || isContentEditable);
  }

  // Listen for focus events to remember where the user was typing
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (!isInsideGUI(target) && isEditableElement(target)) {
      window.autoScribeLastActiveInput = target;
    }
  }, true);
  
  // Create floating GUI overlay
  function createFloatingGUI() {
    // Remove existing GUI if it exists
    const existingGUI = document.getElementById('autoScribeFloatingGUI');
    if (existingGUI) {
      existingGUI.remove();
    }
    
    // Create the floating GUI container
    const guiContainer = document.createElement('div');
    guiContainer.id = 'autoScribeFloatingGUI';
    guiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 2px solid #4285f4;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: 'Google Sans', Arial, sans-serif;
      font-size: 14px;
      user-select: none;
      resize: both;
      overflow: hidden;
    `;
    
    // Create the header (draggable area)
    const header = document.createElement('div');
    header.style.cssText = `
      background: #4285f4;
      color: white;
      padding: 8px 12px;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
    `;
    header.innerHTML = `
      <span>AutoScribe</span>
      <button id="autoScribeMinimize" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">−</button>
    `;
    
    // Create the content area
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 16px;
      background: white;
    `;
    content.innerHTML = `
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Text to type:</label>
        <textarea id="autoScribeInput" placeholder="Enter text here..." style="width: 100%; height: 80px; border: 1px solid #ddd; border-radius: 4px; padding: 8px; resize: vertical; font-family: inherit;"></textarea>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          <span id="autoScribeCharCount">0</span> characters
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Speed: <span id="autoScribeWpmValue">60</span> WPM</label>
        <input type="range" id="autoScribeWpm" min="20" max="200" value="60" style="width: 100%;">
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <button id="autoScribeStart" style="background: #34a853; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 500;">Start</button>
        <button id="autoScribeStop" style="background: #ea4335; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 500;" disabled>Stop</button>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button id="autoScribePause" style="background: #fbbc04; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 500;" disabled>Pause</button>
        <button id="autoScribeResume" style="background: #4285f4; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 500;" disabled>Resume</button>
      </div>
      
      <div id="autoScribeStatus" style="margin-top: 12px; padding: 8px; border-radius: 4px; font-size: 12px; text-align: center; display: none;"></div>
    `;
    
    // Create minimized version
    const minimized = document.createElement('div');
    minimized.id = 'autoScribeMinimized';
    minimized.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      cursor: pointer;
      z-index: 10000;
      font-weight: 500;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    minimized.textContent = 'AutoScribe';
    
    // Assemble the GUI
    guiContainer.appendChild(header);
    guiContainer.appendChild(content);
    document.body.appendChild(guiContainer);
    document.body.appendChild(minimized);
    
    // Add event listeners
    setupGUIEventListeners(guiContainer, minimized, header);
    
    return guiContainer;
  }
  
  function setupGUIEventListeners(guiContainer, minimized, header) {
    const input = document.getElementById('autoScribeInput');
    const wpmSlider = document.getElementById('autoScribeWpm');
    const wpmValue = document.getElementById('autoScribeWpmValue');
    const charCount = document.getElementById('autoScribeCharCount');
    const startBtn = document.getElementById('autoScribeStart');
    const stopBtn = document.getElementById('autoScribeStop');
    const pauseBtn = document.getElementById('autoScribePause');
    const resumeBtn = document.getElementById('autoScribeResume');
    const minimizeBtn = document.getElementById('autoScribeMinimize');
    const statusDiv = document.getElementById('autoScribeStatus');
    
    // Character count
    input.addEventListener('input', () => {
      const length = input.value.length;
      charCount.textContent = length;
      
      if (length > 1000) {
        input.value = input.value.slice(0, 1000);
        charCount.textContent = '1000';
        showStatus('Maximum 1000 characters allowed.', 'error');
      } else if (/\n/.test(input.value)) {
        input.value = input.value.replace(/\n/g, ' ');
        showStatus('No line breaks allowed.', 'error');
      }
    });
    
    // WPM slider
    wpmSlider.addEventListener('input', () => {
      wpmValue.textContent = wpmSlider.value;
    });
    
    // Button event listeners
    startBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) {
        showStatus('Please enter some text.', 'error');
        return;
      }
      if (text.length > 1000) {
        showStatus('Maximum 1000 characters allowed.', 'error');
        return;
      }
      
      startTyping(text, parseInt(wpmSlider.value, 10));
      setButtonStates('typing');
      showStatus('Starting typing...', 'success');
    });
    
    stopBtn.addEventListener('click', () => {
      stopTyping();
      setButtonStates('idle');
      showStatus('Typing stopped.', 'success');
    });
    
    pauseBtn.addEventListener('click', () => {
      pauseTyping();
      setButtonStates('paused');
      showStatus('Typing paused.', 'success');
    });
    
    resumeBtn.addEventListener('click', () => {
      resumeTyping();
      setButtonStates('typing');
      showStatus('Typing resumed.', 'success');
    });
    
    // Minimize/Maximize
    minimizeBtn.addEventListener('click', () => {
      guiContainer.style.display = 'none';
      minimized.style.display = 'block';
    });
    
    minimized.addEventListener('click', () => {
      guiContainer.style.display = 'block';
      minimized.style.display = 'none';
    });
    
    // Dragging functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = guiContainer.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      guiContainer.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - guiContainer.offsetWidth;
      const maxY = window.innerHeight - guiContainer.offsetHeight;
      
      guiContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      guiContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
      guiContainer.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        guiContainer.style.cursor = 'default';
      }
    });
    
    function setButtonStates(state) {
      if (state === 'idle') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
      } else if (state === 'typing') {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
      } else if (state === 'paused') {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
      }
    }
    
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
      statusDiv.style.background = type === 'error' ? '#fce8e6' : '#e6f4ea';
      statusDiv.style.color = type === 'error' ? '#d93025' : '#137333';
      statusDiv.style.border = `1px solid ${type === 'error' ? '#fad2cf' : '#b7dfb9'}`;
      
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
    
    // Initialize button states
    setButtonStates('idle');
  }
  
  /* ---------- helper functions ---------- */
    function calculateDelay() {
    const state = window.autoScribeTypingState;
    // Get a random WPM between min and max
    const randomWPM = Math.floor(Math.random() * (state.maxWPM - state.minWPM + 1)) + state.minWPM;
    // Convert WPM to milliseconds per character (60000 ms per minute / (WPM * 5 chars per word))
    const baseDelay = 60000 / (randomWPM * 5);
    // Add some natural variation (±20%)
    const variation = baseDelay * 0.2;
    return baseDelay + (Math.random() * variation * 2 - variation);
  }
    // WPM = words per minute, so we need to convert to characters per second
    const charsPerSecond = (wpm * 5) / 60;
    const delayMs = 1000 / charsPerSecond;
    
    // Add some randomness to make it more human-like
    const variation = 0.8 + (Math.random() * 0.4);
    return delayMs * variation;
  }
  
  function findActiveTextInput() {
    console.log('Searching for active text input...');
    
    // Method 1: Check if there's already a focused element
    const activeElement = document.activeElement;
    if (activeElement && !isInsideGUI(activeElement) && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true' ||
        activeElement.getAttribute('contenteditable') === 'true'
    )) {
      console.log('Found active text input:', activeElement);
      return activeElement;
    }

    // Prefer last known user-focused input if available
    if (window.autoScribeLastActiveInput && document.contains(window.autoScribeLastActiveInput)) {
      console.log('Using last active input:', window.autoScribeLastActiveInput);
      return window.autoScribeLastActiveInput;
    }
    
    // Method 2: Look for common text input selectors
    const commonSelectors = [
      'input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'input[type="search"]', 'input[type="url"]', 'input[type="tel"]', 'input[type="number"]',
      'textarea',
      '[contenteditable="true"]', '[contenteditable="true"][role="textbox"]',
      '.ql-editor', '.ProseMirror', '.CodeMirror', '.ace_editor', '.monaco-editor',
      '.kix-appview-editor-content', '.kix-appview-editor-content .kix-lineview-content', '.docs-textarea',
      '.wysiwyg-editor', '.rich-text-editor', '.text-editor', '.editor', '.input', '.text-input',
      '.form-control', '.form-input', '.search-input', '.chat-input', '.message-input', '.comment-input',
      '.post-input', '.status-input', '.tweet-input', '.reply-input', '.note-input', '.memo-input',
      '.draft-input', '.compose-input', '.write-input', '.type-input', '.enter-input', '.send-input',
      '.submit-input', '.publish-input', '.share-input',
      '.post-text', '.message-text', '.comment-text', '.reply-text', '.note-text', '.memo-text',
      '.draft-text', '.compose-text', '.write-text', '.type-text', '.enter-text', '.send-text',
      '.submit-text', '.publish-text', '.share-text'
    ];
    
    for (const selector of commonSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (isInsideGUI(element)) continue; // never type into our own GUI
        if (element.offsetParent === null || element.style.display === 'none' || element.style.visibility === 'hidden' || element.hidden) {
          continue;
        }
        if (element.offsetWidth < 50 || element.offsetHeight < 20) {
          continue;
        }
        console.log('Found potential text input:', element);
        return element;
      }
    }
    
    // Method 3: Look for any input or textarea
    const allInputs = document.querySelectorAll('input, textarea');
    for (const input of allInputs) {
      if (isInsideGUI(input)) continue;
      if (input.offsetParent !== null && input.style.display !== 'none' && input.style.visibility !== 'hidden' && !input.hidden && input.offsetWidth >= 50 && input.offsetHeight >= 20) {
        console.log('Found fallback input:', input);
        return input;
      }
    }
    
    // Method 4: Look for any contenteditable element
    const allContentEditables = document.querySelectorAll('[contenteditable="true"]');
    for (const element of allContentEditables) {
      if (isInsideGUI(element)) continue;
      if (element.offsetParent !== null && element.style.display !== 'none' && element.style.visibility !== 'hidden' && !element.hidden && element.offsetWidth >= 50 && element.offsetHeight >= 20) {
        console.log('Found fallback contenteditable:', element);
        return element;
      }
    }
    
    console.log('No suitable text input found');
    return null;
  }
  
  function focusTextInput(input) {
    console.log('Focusing text input');
    
    try {
      // Click on the input to ensure focus
      if (document.contains(input)) {
        input.click();
        input.focus();
      }
      
      // For contenteditable elements, position cursor at end
      if (input.contentEditable === 'true' || input.getAttribute('contenteditable') === 'true') {
        const selection = window.getSelection();
        const range = document.createRange();
        
        // Find the last text node
        const textNodes = [];
        const walker = document.createTreeWalker(
          input,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }
        
        if (textNodes.length > 0) {
          const lastTextNode = textNodes[textNodes.length - 1];
          selection.removeAllRanges();
          range.setStart(lastTextNode, lastTextNode.textContent.length);
          range.setEnd(lastTextNode, lastTextNode.textContent.length);
          selection.addRange(range);
        } else {
          // No text nodes, position at end of element
          selection.removeAllRanges();
          range.setStart(input, input.childNodes.length);
          range.setEnd(input, input.childNodes.length);
          selection.addRange(range);
        }
        
        console.log('Cursor positioned at end of contenteditable');
      } else {
        // For regular inputs and textareas, position cursor at end
        if (input.setSelectionRange) {
          const length = input.value.length;
          input.setSelectionRange(length, length);
          console.log('Cursor positioned at end of input/textarea');
        }
      }
      
    } catch (error) {
      console.error('Error focusing text input:', error);
    }
  }
  
  function typeCharacter(input, char) {
    console.log('Typing character:', char);
    
    try {
      if (!document.contains(input)) {
        return false;
      }
      input.focus();
      
      // Method 1: For regular inputs and textareas, use value property
      if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
        try {
          const currentValue = input.value || '';
          const cursorPos = input.selectionStart || currentValue.length;
          const newValue = currentValue.slice(0, cursorPos) + char + currentValue.slice(cursorPos);
          input.value = newValue;
          const newCursorPos = cursorPos + 1;
          input.setSelectionRange(newCursorPos, newCursorPos);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Text inserted via value property');
          return true;
        } catch (e) {
          console.log('Value property insertion failed:', e);
        }
      }
      
      // Method 2: For contenteditable elements, use DOM manipulation
      if (input.contentEditable === 'true' || input.getAttribute('contenteditable') === 'true') {
        try {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textNode = document.createTextNode(char);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.addRange(range);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('Text inserted via DOM manipulation');
            return true;
          }
        } catch (e) {
          console.log('DOM manipulation failed:', e);
        }
      }
      
      // Method 3: Try execCommand
      try {
        input.focus();
        const success = document.execCommand('insertText', false, char);
        if (success) {
          console.log('Text inserted via execCommand');
          return true;
        }
      } catch (e) {
        console.log('execCommand failed:', e);
      }
      
      // Method 4: Simulate keyboard events
      const keyCode = char.charCodeAt(0);
      const keydownEvent = new KeyboardEvent('keydown', { key: char, code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true, isTrusted: false });
      const keypressEvent = new KeyboardEvent('keypress', { key: char, code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true, isTrusted: false });
      const keyupEvent = new KeyboardEvent('keyup', { key: char, code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true, isTrusted: false });
      input.dispatchEvent(keydownEvent);
      input.dispatchEvent(keypressEvent);
      input.dispatchEvent(keyupEvent);
      
      // Method 5: Input events
      const beforeInputEvent = new InputEvent('beforeinput', { inputType: 'insertText', data: char, bubbles: true, cancelable: true, composed: true });
      const inputEvent = new InputEvent('input', { inputType: 'insertText', data: char, bubbles: true, cancelable: true, composed: true });
      input.dispatchEvent(beforeInputEvent);
      input.dispatchEvent(inputEvent);
      
      console.log('Keyboard events dispatched to input');
      return true;
      
    } catch (error) {
      console.error('Error typing character:', error);
    }
    return false;
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
      
      // Update GUI status
      const statusDiv = document.getElementById('autoScribeStatus');
      if (statusDiv) {
        statusDiv.textContent = '🎉 Typing completed!';
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#e6f4ea';
        statusDiv.style.color = '#137333';
        statusDiv.style.border = '1px solid #b7dfb9';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
      }
      
      // Reset button states
      const startBtn = document.getElementById('autoScribeStart');
      const stopBtn = document.getElementById('autoScribeStop');
      const pauseBtn = document.getElementById('autoScribePause');
      const resumeBtn = document.getElementById('autoScribeResume');
      
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = true;
      if (resumeBtn) resumeBtn.disabled = true;
      
      chrome.runtime.sendMessage({ done: true });
      return;
    }
    
    // Prefer locked target element captured at start
    let input = typingState.targetElement;
    if (!input || !document.contains(input)) {
      input = window.autoScribeLastActiveInput || findActiveTextInput();
      typingState.targetElement = input;
    }
    if (!input) {
      console.error('Could not find active text input');
      return;
    }
    
    const char = typingState.text[typingState.currentIndex];
    console.log('Typing character:', char, 'at index:', typingState.currentIndex);
    
    // Try to type the character
    // Ensure caret is at the end before attempting to type
    focusTextInput(input);

    const success = typeCharacter(input, char);
    if (success) {
      console.log('Successfully typed character:', char);
      typingState.retryCountForIndex = 0;
      typingState.currentIndex++;
    } else {
      console.log('Failed to type character:', char);
      // Retry a couple of times before advancing to avoid infinite loops
      typingState.retryCountForIndex = (typingState.retryCountForIndex || 0) + 1;
      if (typingState.retryCountForIndex <= 2) {
        const retryDelay = 50;
        typingState.timeoutId = setTimeout(typeNextCharacter, retryDelay);
        return;
      } else {
        // Give up on this char to avoid stalling completely
        typingState.retryCountForIndex = 0;
        typingState.currentIndex++;
      }
    }
    
    // Schedule next character
    const delay = calculateDelay(typingState.wpm);
    console.log('Next character in', delay, 'ms');
    typingState.timeoutId = setTimeout(typeNextCharacter, delay);
  }
  
  function startTyping(text, wpm) {
    console.log('Starting typing with text:', text, 'WPM:', wpm);
    
    // Wait a bit for the page to be ready
    setTimeout(() => {
      // Lock onto the best candidate input, avoiding our GUI
      const preferred = window.autoScribeLastActiveInput;
      const input = (preferred && document.contains(preferred)) ? preferred : findActiveTextInput();
      if (!input) {
        console.error('No text input found');
        return { error: 'Could not find any text input. Please click on a text field first.' };
      }
      
      console.log('Found input:', input);
      
      // Stop any existing typing but preserve last active element
      stopTyping();
      window.autoScribeTypingState.targetElement = input;
      
      // Try to paste the entire text first (faster method)
      try {
        console.log('Attempting to paste entire text...');
        
        // Focus the input
        focusTextInput(input);
        
        // Try to paste using clipboard API
        navigator.clipboard.writeText(text).then(() => {
          // Simulate Ctrl+V paste
          const pasteEvent = new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            keyCode: 86,
            which: 86,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            composed: true
          });
          
          // Dispatch paste event to input
          input.dispatchEvent(pasteEvent);
          
          console.log('Paste event dispatched to input');
          
          // If paste doesn't work, fall back to character-by-character typing
          setTimeout(() => {
            if (!window.autoScribeTypingState.isTyping) {
              console.log('Paste failed, falling back to character typing');
              startCharacterTyping(text, wpm, input);
            }
          }, 500); // Reduced timeout for faster fallback
        }).catch(() => {
          console.log('Clipboard API failed, using character typing');
          startCharacterTyping(text, wpm, input);
        });
        
      } catch (e) {
        console.log('Paste method failed, using character typing:', e);
        startCharacterTyping(text, wpm, input);
      }
    }, 500); // Reduced wait time for faster response
    
    return { success: true };
  }
  
  function startCharacterTyping(text, wpm, input) {
    console.log('Starting character-by-character typing');
    
    // Initialize typing state
    window.autoScribeTypingState = {
      isTyping: true,
      isPaused: false,
      text: text,
      currentIndex: 0,
      wpm: wpm,
      timeoutId: null,
      targetElement: input,
      retryCountForIndex: 0
    };
    
    console.log('Typing state initialized:', window.autoScribeTypingState);
    
    // Focus the input
    focusTextInput(input);
    
    // Start typing
    typeNextCharacter();
  }
  
  function pauseTyping() {
    const typingState = window.autoScribeTypingState;
    if (typingState.isTyping && !typingState.isPaused) {
      typingState.isPaused = true;
      if (typingState.timeoutId) {
        clearTimeout(typingState.timeoutId);
        typingState.timeoutId = null;
      }
      // Do not modify currentIndex so resume continues where it left off
    }
  }
  
  function resumeTyping() {
    const typingState = window.autoScribeTypingState;
    if (typingState.isTyping && typingState.isPaused) {
      typingState.isPaused = false;
      // Ensure we still have a valid target and focus it
      if (!typingState.targetElement || !document.contains(typingState.targetElement)) {
        typingState.targetElement = window.autoScribeLastActiveInput || findActiveTextInput();
      }
      if (typingState.targetElement) {
        focusTextInput(typingState.targetElement);
      }
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
      timeoutId: null,
      targetElement: null,
      retryCountForIndex: 0
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
          
        case 'showGUI':
          createFloatingGUI();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
      
      return true; // Keep message channel open for async response
    });
    
    console.log('Message listener set up');
  }
  
  // Create the floating GUI when the page loads
  window.addEventListener('load', () => {
    console.log('Page fully loaded, creating floating GUI...');
    
    // Wait a bit for the page to fully load
    setTimeout(() => {
      createFloatingGUI();
      
      // Test if we can find any text inputs
      const input = findActiveTextInput();
      if (input) {
        console.log('✅ Text input found:', input);
      } else {
        console.log('❌ No text input found on this page');
      }
    }, 1000);
  });
  
  // Also check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM content loaded, content script ready');
    });
  } else {
    console.log('DOM already loaded, content script ready');
  }