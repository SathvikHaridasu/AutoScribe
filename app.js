// DOM elements
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const wpm = document.getElementById('wpm');
const wpmValue = document.getElementById('wpmValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const errorDiv = document.getElementById('error');
const charCount = document.getElementById('charCount');

// State
let typing = false;
let paused = false;
let textToType = '';
let currentIndex = 0;
let timer = null;

/* ---------- helpers ---------- */
const delay = () => {
    const cps = (wpm.value * 5) / 60;  // "5 chars per word" rule
    return 1000 / cps * (0.8 + Math.random() * 0.4);  // Add human-like variation
};

function showError(msg, isSuccess = false) {
    errorDiv.textContent = msg;
    errorDiv.className = isSuccess ? 'error success' : 'error';
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function setButtons(state) {
    // state: 'idle', 'typing', 'paused'
    startBtn.disabled = state !== 'idle';
    pauseBtn.disabled = state !== 'typing';
    resumeBtn.disabled = state !== 'paused';
    stopBtn.disabled = state === 'idle';
    
    inputText.disabled = state !== 'idle';
    wpm.disabled = state !== 'idle';
}

function typeNext() {
    if (!typing || currentIndex >= textToType.length) {
        if (currentIndex >= textToType.length) {
            showError('🎉 Typing completed!', true);
            resetTyping();
        }
        return;
    }

    const ch = textToType[currentIndex++];
    outputText.value += ch;
    outputText.scrollTop = outputText.scrollHeight;  // Auto-scroll to bottom

    timer = setTimeout(typeNext, delay());
}

function resetTyping() {
    typing = false;
    paused = false;
    currentIndex = 0;
    clearTimeout(timer);
    setButtons('idle');
}

/* ---------- event listeners ---------- */
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
    } else {
        errorDiv.style.display = 'none';
    }
});

startBtn.addEventListener('click', () => {
    textToType = inputText.value;
    
    if (!textToType) {
        showError('Please enter some text to type.');
        return;
    }
    
    outputText.value = '';  // Clear previous output
    currentIndex = 0;
    typing = true;
    paused = false;
    
    setButtons('typing');
    typeNext();
});

pauseBtn.addEventListener('click', () => {
    clearTimeout(timer);
    paused = true;
    typing = false;
    setButtons('paused');
});

resumeBtn.addEventListener('click', () => {
    if (paused) {
        typing = true;
        paused = false;
        setButtons('typing');
        typeNext();
    }
});

stopBtn.addEventListener('click', () => {
    resetTyping();
    outputText.value = '';  // Clear output
});
