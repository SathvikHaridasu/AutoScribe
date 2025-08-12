# AutoScribe - Automated Typing Tool

A desktop application that simulates real keyboard input for automated typing in any application. Perfect for tasks requiring repetitive typing, testing, or demonstrations.

## Features

- **Universal Compatibility**: Works with any application that accepts keyboard input (Google Docs, Microsoft Word, Notepad, etc.)
- **Real Keyboard Simulation**: Uses system-level keyboard events for reliable input
- **Human-like Typing**: Natural typing patterns with random delays
- **Adjustable Speed**: Configure typing speed from 1 to 200 WPM
- **Global Hotkeys**: Control the application from any window
- **Safety Features**: 
  - Emergency stop by moving mouse to screen corner
  - Stop hotkey works globally
  - Configurable countdown delay
- **User-Friendly Interface**: Clean GUI with clear controls and status indicators

## Requirements

- Python 3.x
- Required packages:
  ```
  pip install pyautogui keyboard
  ```

## Installation

1. Clone or download this repository
2. Install the required packages:
   ```
   pip install pyautogui keyboard
   ```
3. Run the application:
   ```
   python autoscribe.py
   ```

## Usage

1. Launch AutoScribe
2. Enter or paste the text you want to type
3. Adjust the typing speed (WPM)
4. Set your countdown delay (time to switch windows)
5. Click Start or press F6
6. Switch to your target application during the countdown
7. Watch as the text is typed automatically

## Default Hotkeys

- **F6**: Start typing
- **F7**: Stop typing
- **F8**: Pause/Resume typing

Hotkeys can be customized in the Settings menu.

## Safety Features

- Move mouse to any corner of the screen to force-stop typing
- Global stop hotkey (F7) works at any time
- Configurable start delay for safe window switching
- Pause/Resume functionality

## Notes

- Run as administrator if typing into elevated applications
- Use responsibly and in accordance with application terms of service
- Test in a safe environment first to get familiar with the controls
- **Full Control** - Start / Pause / Resume / Stop functionality
- **Realistic Delays** with randomized timing to mimic human typing
- **Modern UI** with beautiful gradient design and smooth animations

## Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## Usage

1. **Open Google Docs** (https://docs.google.com/document/)
2. **Click the extension icon** in your Chrome toolbar
3. **Paste or type text** in the textarea (max 1000 characters, no line breaks)
4. **Adjust typing speed** using the WPM slider (default: 60 WPM)
5. **Click in your Google Doc** to position the cursor where you want typing to start
6. **Click "Start Typing"** to begin the simulation
7. **Use Pause/Resume/Stop** buttons to control the process
