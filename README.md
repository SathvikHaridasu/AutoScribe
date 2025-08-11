# AutoScribe Chrome Extension

A Chrome extension that simulates realistic character-by-character typing in Google Docs, perfect for creating authentic typing demonstrations or educational content.

## ✨ Features

- **Character-by-Character Typing Simulation** in Google Docs
- **Human-like Typing Patterns** with natural pauses and speed variations
- **Configurable Typing Speed** (10 - 200 WPM)
- **Full Control** - Start / Pause / Resume / Stop functionality
- **Realistic Delays** with randomized timing to mimic human typing
- **Modern UI** with beautiful gradient design and smooth animations

## 🚀 Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## 📖 Usage

1. **Open Google Docs** (https://docs.google.com/document/)
2. **Click the extension icon** in your Chrome toolbar
3. **Paste or type text** in the textarea (max 1000 characters, no line breaks)
4. **Adjust typing speed** using the WPM slider (default: 60 WPM)
5. **Click in your Google Doc** to position the cursor where you want typing to start
6. **Click "Start Typing"** to begin the simulation
7. **Use Pause/Resume/Stop** buttons to control the process

## 🔧 Troubleshooting

### Common Issues

**Extension not working on Google Docs:**
- Make sure you're on a Google Docs page (URL should start with `https://docs.google.com/document/`)
- Try refreshing the page
- Check that the extension is enabled in Chrome

**Content script not responding:**
- Click the "Test Connection" button in the popup
- If it fails, refresh the Google Docs page and try again
- Make sure you have the necessary permissions enabled

**Typing not appearing:**
- Ensure your cursor is positioned in the Google Docs editor
- Try clicking in the document area first
- Check that the document is not in read-only mode

### Testing

Open `test.html` in your browser to run diagnostic tests and verify the extension is working correctly.

## 🛠️ Technical Details

- **Manifest Version:** 3 (latest Chrome extension standard)
- **Permissions:** `activeTab`, `scripting`, `tabs`
- **Host Permissions:** `https://docs.google.com/*`
- **Content Script:** Automatically injected on Google Docs pages
- **Background Script:** Handles communication and tab management

## 📝 File Structure

```
AutoScribe/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup interface
├── popup.css          # Popup styling
├── popup.js           # Popup functionality
├── content.js         # Content script for Google Docs
├── background.js      # Background service worker
├── test.html          # Testing and diagnostics page
└── README.md          # This file
```

## 🎯 How It Works

The extension uses multiple methods to simulate typing in Google Docs:

1. **execCommand API** - Primary method for text insertion
2. **Selection API** - Fallback for cursor positioning
3. **Input Events** - Simulates real keyboard input events
4. **Focus Management** - Ensures proper editor focus

The typing simulation includes:
- **Realistic timing** based on WPM (words per minute)
- **Random variations** to mimic human typing patterns
- **Proper cursor positioning** and focus management
- **Error handling** for different Google Docs states

## 🔄 Recent Fixes

- ✅ Fixed duplicate code and conflicting implementations
- ✅ Added missing `typingState` variable declaration
- ✅ Improved error handling and response formatting
- ✅ Enhanced background script functionality
- ✅ Added completion notification handling
- ✅ Created comprehensive test page
- ✅ Updated documentation and troubleshooting guide

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension!
