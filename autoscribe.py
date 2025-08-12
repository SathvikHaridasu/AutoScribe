import tkinter as tk
from tkinter import ttk, messagebox
import pyautogui
import time
import threading
import keyboard
import json
import os
import random
from pathlib import Path

# Disable PyAutoGUI's pause between actions
pyautogui.PAUSE = 0
# Enable fail-safe (move mouse to corner to stop)
pyautogui.FAILSAFE = True

class AutoScribe:
    def __init__(self):
        # Initialize the main window
        self.root = tk.Tk()
        self.root.title("AutoScribe - Typing Simulator")
        self.root.geometry("600x500")
        
        # Set window icon (if available)
        try:
            icon_path = Path(__file__).parent / "AutoScribe.png"
            if icon_path.exists():
                icon = tk.PhotoImage(file=str(icon_path))
                self.root.iconphoto(True, icon)
        except Exception:
            pass  # Icon setting is not critical
        
        # Initialize variables
        self.running = False
        self.paused = False
        
        # State variables
        self.typing = False
        self.paused = False
        self.text_to_type = ""
        self.current_index = 0
        self.min_wpm = tk.IntVar(value=60)
        self.max_wpm = tk.IntVar(value=80)
        
        # Hotkey settings (with defaults)
        self.settings = {
            'start_hotkey': 'F6',
            'stop_hotkey': 'F7',
            'pause_hotkey': 'F8'
        }
        
        self.load_settings()
        self.setup_ui()
        self.setup_hotkeys()
        
    def load_settings(self):
        """Load settings from config file"""
        config_path = Path('config.json')
        if config_path.exists():
            with open(config_path, 'r') as f:
                self.settings.update(json.load(f))
    
    def save_settings(self):
        """Save settings to config file"""
        with open('config.json', 'w') as f:
            json.dump(self.settings, f, indent=4)
    
    def setup_ui(self):
        """Setup the user interface"""
        # Main frame
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Text input area
        self.text_area = tk.Text(self.main_frame, height=10, width=50)
        self.text_area.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Speed control frame
        speed_frame = ttk.LabelFrame(self.main_frame, text="Typing Speed (WPM)", padding="5")
        speed_frame.pack(fill=tk.X, pady=5)
        
        # Min WPM input
        min_frame = ttk.Frame(speed_frame)
        min_frame.pack(side=tk.LEFT, padx=5)
        ttk.Label(min_frame, text="Min WPM:").pack(side=tk.LEFT)
        min_wpm_entry = ttk.Entry(min_frame, textvariable=self.min_wpm, width=5)
        min_wpm_entry.pack(side=tk.LEFT, padx=5)
        
        # Max WPM input
        max_frame = ttk.Frame(speed_frame)
        max_frame.pack(side=tk.LEFT, padx=5)
        ttk.Label(max_frame, text="Max WPM:").pack(side=tk.LEFT)
        max_wpm_entry = ttk.Entry(max_frame, textvariable=self.max_wpm, width=5)
        max_wpm_entry.pack(side=tk.LEFT, padx=5)
        
        # Validate WPM inputs
        def validate_wpm(*args):
            try:
                min_wpm = self.min_wpm.get()
                max_wpm = self.max_wpm.get()
                if min_wpm > max_wpm:
                    messagebox.showerror("Invalid Input", "Minimum WPM must be less than or equal to Maximum WPM")
                    self.min_wpm.set(max_wpm)
            except tk.TclError:
                pass  # Invalid integer input, ignore
                
        self.min_wpm.trace('w', validate_wpm)
        self.max_wpm.trace('w', validate_wpm)
        
        # Control buttons
        button_frame = ttk.Frame(self.main_frame)
        button_frame.pack(fill=tk.X, pady=5)
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Status frame at the top
        status_frame = ttk.Frame(main_frame)
        status_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        self.status_label = ttk.Label(status_frame, text="Status: Ready")
        self.status_label.pack(side=tk.LEFT)
        
        self.countdown_label = ttk.Label(status_frame, text="")
        self.countdown_label.pack(side=tk.RIGHT)
        
        # Text input
        ttk.Label(main_frame, text="Text to Type:").grid(row=1, column=0, sticky=tk.W)
        self.text_input = tk.Text(main_frame, height=10, width=50)
        self.text_input.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E))
        
        # WPM control
        wpm_frame = ttk.Frame(main_frame)
        wpm_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        ttk.Label(wpm_frame, text="Typing Speed (WPM):").pack(side=tk.LEFT)
        self.wpm_var = tk.StringVar(value="60")
        self.wpm_spinbox = ttk.Spinbox(
            wpm_frame, 
            from_=1, 
            to=200, 
            width=5, 
            textvariable=self.wpm_var
        )
        self.wpm_spinbox.pack(side=tk.LEFT, padx=5)
        
        # Control buttons
        btn_frame = ttk.Frame(main_frame)
        btn_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        self.start_btn = ttk.Button(btn_frame, text=f"Start ({self.settings['start_hotkey']})", command=self.start_typing)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        
        self.pause_btn = ttk.Button(btn_frame, text=f"Pause ({self.settings['pause_hotkey']})", command=self.pause_typing, state=tk.DISABLED)
        self.pause_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_btn = ttk.Button(btn_frame, text=f"Stop ({self.settings['stop_hotkey']})", command=self.stop_typing, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        
        # Settings button
        self.settings_btn = ttk.Button(btn_frame, text="Settings", command=self.show_settings)
        self.settings_btn.pack(side=tk.RIGHT, padx=5)
        
        # Delay before typing
        delay_frame = ttk.Frame(main_frame)
        delay_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        ttk.Label(delay_frame, text="Start Delay (seconds):").pack(side=tk.LEFT)
        self.delay_var = tk.StringVar(value="3")
        self.delay_spinbox = ttk.Spinbox(
            delay_frame, 
            from_=0, 
            to=10, 
            width=5, 
            textvariable=self.delay_var
        )
        self.delay_spinbox.pack(side=tk.LEFT, padx=5)
        
        # Instructions
        instructions = (
            "Instructions:\n"
            "1. Enter the text you want to type\n"
            "2. Set your desired typing speed\n"
            "3. Click Start or press the hotkey\n"
            "4. Switch to your target window within the countdown period\n"
            "5. The text will be typed automatically"
        )
        ttk.Label(main_frame, text=instructions, justify=tk.LEFT).grid(
            row=6, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10
        )

    def setup_hotkeys(self):
        """Setup global hotkeys"""
        keyboard.on_press_key(self.settings['start_hotkey'], lambda _: self.start_typing())
        keyboard.on_press_key(self.settings['stop_hotkey'], lambda _: self.stop_typing())
        keyboard.on_press_key(self.settings['pause_hotkey'], lambda _: self.pause_typing())
    
    def show_settings(self):
        """Show settings dialog"""
        settings_window = tk.Toplevel(self.root)
        settings_window.title("Settings")
        settings_window.geometry("300x200")
        settings_window.transient(self.root)
        
        ttk.Label(settings_window, text="Hotkey Settings").grid(row=0, column=0, columnspan=2, pady=10)
        
        row = 1
        hotkey_vars = {}
        
        for key in ['start_hotkey', 'stop_hotkey', 'pause_hotkey']:
            ttk.Label(settings_window, text=f"{key.replace('_', ' ').title()}:").grid(
                row=row, column=0, sticky=tk.W, padx=5, pady=5
            )
            
            var = tk.StringVar(value=self.settings[key])
            hotkey_vars[key] = var
            entry = ttk.Entry(settings_window, textvariable=var)
            entry.grid(row=row, column=1, sticky=(tk.W, tk.E), padx=5)
            row += 1
        
        def save_settings():
            for key, var in hotkey_vars.items():
                self.settings[key] = var.get()
            self.save_settings()
            self.setup_hotkeys()  # Refresh hotkeys
            settings_window.destroy()
            self.update_button_text()  # Update button text with new hotkeys
        
        ttk.Button(settings_window, text="Save", command=save_settings).grid(
            row=row, column=0, columnspan=2, pady=20
        )
    
    def update_button_text(self):
        """Update button text with current hotkeys"""
        self.start_btn.configure(text=f"Start ({self.settings['start_hotkey']})")
        self.pause_btn.configure(text=f"Pause ({self.settings['pause_hotkey']})")
        self.stop_btn.configure(text=f"Stop ({self.settings['stop_hotkey']})")
    
    def countdown(self, seconds):
        """Countdown before starting to type"""
        for i in range(seconds, 0, -1):
            if not self.typing:  # If stopped during countdown
                return False
            self.countdown_label.configure(text=f"Starting in {i}...")
            self.root.update()
            time.sleep(1)
        self.countdown_label.configure(text="")
        return True

    def calculate_delay(self):
        """Calculate human-like delay between keystrokes"""
        try:
            wpm = float(self.wpm_var.get())
        except ValueError:
            wpm = 60
        
        # Ensure WPM is within reasonable bounds
        wpm = max(1, min(wpm, 200))
        
        # Base delay calculation
        cps = (wpm * 5) / 60  # standard 5 characters per word
        base_delay = 1 / cps if cps > 0 else 0.1
        
        # Add natural variation (typing rhythm)
        rhythm_variation = random.uniform(0.8, 1.2)
        
        # Occasionally add a longer pause (thinking pause)
        if random.random() < 0.01:  # 1% chance of a longer pause
            return base_delay * random.uniform(2, 4)
        
        # Occasionally add a shorter pause (quick typing burst)
        if random.random() < 0.05:  # 5% chance of a quick burst
            return base_delay * random.uniform(0.5, 0.8)
        
        return base_delay * rhythm_variation

    def get_context_aware_delay(self, char, prev_char=None, next_char=None):
        """Calculate delay based on character context"""
        base_delay = self.calculate_delay()
        
        # Common character pairs get typed faster
        common_pairs = {
            'th': 0.85, 'he': 0.85, 'an': 0.85, 'in': 0.85, 'er': 0.85,
            'on': 0.85, 'at': 0.85, 'nd': 0.85, 'st': 0.85, 'es': 0.85,
            'en': 0.85, 'of': 0.85, 'te': 0.85, 'ed': 0.85, 'ti': 0.85,
        }
        
        if prev_char and (prev_char + char).lower() in common_pairs:
            return base_delay * common_pairs[(prev_char + char).lower()]
        
        # Slower typing for numbers and special characters
        if char.isnumeric() or char in '!@#$%^&*()_+-=[]{}\\|;:\'",.<>/?':
            return base_delay * random.uniform(1.2, 1.5)
        
        # Slight pause after punctuation
        if prev_char in '.!?':
            return base_delay * random.uniform(1.5, 2.0)
        
        # Faster typing for space after common words
        if char == ' ' and prev_char in 'dtsn':  # Common word endings
            return base_delay * 0.8
        
        return base_delay

    def type_text(self):
        """The main typing function that runs in a separate thread"""
        try:
            delay_seconds = int(self.delay_var.get())
        except ValueError:
            delay_seconds = 3

        if not self.countdown(delay_seconds):
            return

        self.status_label.configure(text="Status: Typing...")
        last_word_time = time.time()
        
        while self.current_index < len(self.text_to_type) and self.typing:
            if not self.paused:
                char = self.text_to_type[self.current_index]
                prev_char = self.text_to_type[self.current_index - 1] if self.current_index > 0 else None
                next_char = self.text_to_type[self.current_index + 1] if self.current_index < len(self.text_to_type) - 1 else None
                
                # Add natural pauses between words
                if char == ' ':
                    word_gap = time.time() - last_word_time
                    if word_gap > 0.5 and random.random() < 0.1:  # 10% chance of pause between words
                        time.sleep(random.uniform(0.3, 0.7))
                    last_word_time = time.time()
                
                # Handle special characters
                if char == '\n':
                    keyboard.press_and_release('enter')
                    time.sleep(random.uniform(0.5, 1.0))  # Longer pause after enter
                elif char == '\t':
                    keyboard.press_and_release('tab')
                elif char.isupper():
                    # Slightly slower typing for uppercase letters
                    time.sleep(random.uniform(0.05, 0.1))
                    keyboard.write(char)
                else:
                    # Use write() which handles special characters more reliably than press_and_release
                    keyboard.write(char)
                
                # Get context-aware delay
                delay = self.get_context_aware_delay(char, prev_char, next_char)
                time.sleep(delay)
                
                self.current_index += 1
            else:
                time.sleep(0.1)  # Reduce CPU usage while paused
                
        if self.current_index >= len(self.text_to_type):
            self.status_label.configure(text="Status: Completed")
            self.reset_state()

    def start_typing(self):
        """Start the typing process"""
        if self.typing:
            return
            
        self.text_to_type = self.text_input.get("1.0", tk.END).strip()
        if not self.text_to_type:
            messagebox.showwarning("Warning", "Please enter some text to type!")
            return
            
        self.typing = True
        self.current_index = 0
        self.start_btn.configure(state=tk.DISABLED)
        self.pause_btn.configure(state=tk.NORMAL)
        self.stop_btn.configure(state=tk.NORMAL)
        
        # Start typing in a separate thread
        threading.Thread(target=self.type_text, daemon=True).start()

    def pause_typing(self):
        """Pause/Resume typing"""
        if not self.typing:
            return
            
        self.paused = not self.paused
        status = "Paused" if self.paused else "Typing..."
        self.status_label.configure(text=f"Status: {status}")
        self.pause_btn.configure(text=f"Resume ({self.settings['pause_hotkey']})" if self.paused else f"Pause ({self.settings['pause_hotkey']})")

    def stop_typing(self):
        """Stop typing"""
        self.reset_state()
        self.status_label.configure(text="Status: Stopped")
        self.countdown_label.configure(text="")

    def reset_state(self):
        """Reset all state variables and UI elements"""
        self.typing = False
        self.paused = False
        self.current_index = 0
        self.start_btn.configure(state=tk.NORMAL)
        self.pause_btn.configure(state=tk.DISABLED)
        self.stop_btn.configure(state=tk.DISABLED)
        self.pause_btn.configure(text=f"Pause ({self.settings['pause_hotkey']})")

    def run(self):
        """Start the application"""
        self.root.mainloop()

def main():
    # Prevent multiple instances
    try:
        # Ensure pyautogui works safely
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.001
        
        app = AutoScribe()
        app.run()
    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
