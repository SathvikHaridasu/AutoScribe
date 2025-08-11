
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
    setupGUIEventListeners(guiContainer, minimized);
    
    return guiContainer;
  }
  
  function setupGUIEventListeners(guiContainer, minimized) {
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
    
    // Try multiple selectors to find the actual editable content
    const selectors = [
      '.kix-lineview-content',
      '[contenteditable="true"][role="textbox"]',
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
      // Click on the editor to ensure focus
      editor.click();
      editor.focus();
      
      // Set cursor to end of content
      const range = document.createRange();
      const selection = window.getSelection();
      
      selection.removeAllRanges();
      
      // Find the last text node or create one
      let targetNode = editor;
      if (editor.childNodes.length > 0) {
        const lastNode = editor.childNodes[editor.childNodes.length - 1];
        if (lastNode.nodeType === Node.TEXT_NODE) {
          targetNode = lastNode;
          range.setStart(targetNode, targetNode.textContent.length);
          range.setEnd(targetNode, targetNode.textContent.length);
        } else {
          range.setStartAfter(lastNode);
          range.setEndAfter(lastNode);
        }
      } else {
        range.setStart(editor, 0);
        range.setEnd(editor, 0);
      }
  
      selection.addRange(range);
      
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
      
      // Method 1: Try to insert text directly into the editor
      try {
        // Get current selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // Create text node and insert it
          const textNode = document.createTextNode(char);
          range.insertNode(textNode);
          
          // Move cursor after the inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          
          // Update selection
          selection.removeAllRanges();
          selection.addRange(range);
          
          console.log('Text inserted via direct DOM manipulation');
          return true;
        }
      } catch (e) {
        console.log('Direct DOM manipulation failed:', e);
      }
      
      // Method 2: Try execCommand
      try {
        const success = document.execCommand('insertText', false, char);
        if (success) {
          console.log('Text inserted via execCommand');
          return true;
        }
      } catch (e) {
        console.log('execCommand failed:', e);
      }
      
      // Method 3: Try to find the actual textarea and simulate typing
      const textArea = document.querySelector('.kix-lineview-content') ||
                      document.querySelector('[contenteditable="true"][role="textbox"]') ||
                      document.querySelector('.kix-appview-editor-content') ||
                      editor;
      
      // Method 4: Try to find Google Docs specific elements
      const googleDocsElements = [
        document.querySelector('.kix-lineview-content'),
        document.querySelector('.kix-appview-editor-content'),
        document.querySelector('[contenteditable="true"][role="textbox"]'),
        document.querySelector('.docs-textarea'),
        document.querySelector('.kix-appview-editor-content .kix-lineview-content'),
        document.querySelector('.kix-appview-editor-content .kix-lineview-content-wrapper'),
        document.querySelector('.kix-appview-editor-content .kix-lineview-content-wrapper .kix-lineview-content')
      ].filter(el => el !== null);
      
      // Try each Google Docs element
      for (const element of googleDocsElements) {
        try {
          element.focus();
          
          // Try to insert text directly
          if (element.textContent !== undefined) {
            element.textContent += char;
            console.log('Text inserted via textContent modification on:', element);
            return true;
          }
          
          // Try to set innerHTML
          if (element.innerHTML !== undefined) {
            element.innerHTML += char;
            console.log('Text inserted via innerHTML modification on:', element);
            return true;
          }
        } catch (e) {
          console.log('Failed to modify element:', element, e);
        }
      }
      
      // Method 5: Simulate keyboard events more realistically
      const keyCode = char.charCodeAt(0);
      
      // Create more realistic keyboard events
      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        isTrusted: false
      });
      
      const keypressEvent = new KeyboardEvent('keypress', {
        key: char,
        code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        isTrusted: false
      });
      
      const keyupEvent = new KeyboardEvent('keyup', {
        key: char,
        code: char.length === 1 ? `Key${char.toUpperCase()}` : 'Key' + char,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        isTrusted: false
      });
      
      // Dispatch events to all possible elements
      [textArea, ...googleDocsElements].forEach(element => {
        if (element) {
          element.dispatchEvent(keydownEvent);
          element.dispatchEvent(keypressEvent);
          element.dispatchEvent(keyupEvent);
        }
      });
      
      // Method 6: Input events
      const beforeInputEvent = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      
      const inputEvent = new InputEvent('input', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      
      [textArea, ...googleDocsElements].forEach(element => {
        if (element) {
          element.dispatchEvent(beforeInputEvent);
          element.dispatchEvent(inputEvent);
        }
      });
      
      console.log('Character typing completed');
      return false;
    } catch (error) {
      console.error('Error typing character:', error);
      return false;
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
    
    const editor = findGoogleDocsEditor();
    if (!editor) {
      console.error('Could not find Google Docs editor');
      return;
    }
    
    const char = typingState.text[typingState.currentIndex];
    console.log('Typing character:', char, 'at index:', typingState.currentIndex);
    
    // Try to type the character
    const success = typeCharacter(editor, char);
    if (success) {
      console.log('Successfully typed character:', char);
    } else {
      console.log('Failed to type character:', char);
    }
    
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
      
      // Try to paste the entire text first (faster method)
      try {
        console.log('Attempting to paste entire text...');
        
        // Focus the editor
        focusEditor(editor);
        
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
          
          editor.dispatchEvent(pasteEvent);
          console.log('Paste event dispatched');
          
          // If paste doesn't work, fall back to character-by-character typing
          setTimeout(() => {
            if (!window.autoScribeTypingState.isTyping) {
              console.log('Paste failed, falling back to character typing');
              startCharacterTyping(text, wpm, editor);
            }
          }, 500);
        }).catch(() => {
          console.log('Clipboard API failed, using character typing');
          startCharacterTyping(text, wpm, editor);
        });
        
      } catch (e) {
        console.log('Paste method failed, using character typing:', e);
        startCharacterTyping(text, wpm, editor);
      }
    }, 1000); // Wait 1 second for Google Docs to be ready
    
    return { success: true };
  }
  
  function startCharacterTyping(text, wpm, editor) {
    console.log('Starting character-by-character typing');
    
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
    
    // Wait a bit for Google Docs to fully load
    setTimeout(() => {
      createFloatingGUI();
      
      // Test if we can find the Google Docs editor
      const editor = findGoogleDocsEditor();
      if (editor) {
        console.log('✅ Google Docs editor found:', editor);
      } else {
        console.log('❌ Google Docs editor not found');
      }
    }, 2000);
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