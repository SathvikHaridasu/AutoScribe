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

# Ensure pyautogui is configured properly
pyautogui.FAILSAFE = True  # Move mouse to corner to abort
pyautogui.PAUSE = 0  # No delay between actions

class AutoScribe:
    def __init__(self):
        # Initialize the main window
        self.root = tk.Tk()
        self.root.title("AutoScribe")
        self.root.geometry("400x500")
        
        # State variables
        self.typing = False
        self.paused = False
        self.text_to_type = ""
        self.current_index = 0
        self.min_wpm = tk.IntVar(value=60)
        self.max_wpm = tk.IntVar(value=80)
        
        # Typing pattern variables
        self.current_wpm = 60
        self.target_wpm = 60  # Target speed to gradually move towards
        self.speed_change_chance = 0.15  # 15% chance to change speed per character
        self.acceleration = 0  # Current speed change direction and magnitude
        self.words_typed_since_last_pause = 0
        self.next_pause_after_words = random.randint(3, 8)
        self.burst_mode = False  # For sudden speed bursts
        
        # Load settings and setup UI
        self.load_settings()
        self.setup_ui()
        self.setup_hotkeys()

    def load_settings(self):
        """Load settings from config file"""
        try:
            with open('config.json', 'r') as f:
                config = json.load(f)
                self.start_key = config.get("start_hotkey", "F6")
                self.stop_key = config.get("stop_hotkey", "F7")
                self.pause_key = config.get("pause_hotkey", "F8")
        except:
            self.start_key = "F6"
            self.stop_key = "F7"
            self.pause_key = "F8"
            self.save_settings()

    def save_settings(self):
        """Save settings to config file"""
        config = {
            "start_hotkey": self.start_key,
            "stop_hotkey": self.stop_key,
            "pause_hotkey": self.pause_key
        }
        with open("config.json", "w") as f:
            json.dump(config, f, indent=4)

    def setup_ui(self):
        """Setup the user interface"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Status label
        self.status_label = ttk.Label(main_frame, text="Status: Ready")
        self.status_label.pack(fill=tk.X, pady=(0, 10))
        
        # Text input area
        ttk.Label(main_frame, text="Enter text to type:").pack(anchor=tk.W)
        self.text_area = tk.Text(main_frame, height=10, width=40)
        self.text_area.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Speed control frame
        speed_frame = ttk.LabelFrame(main_frame, text="Typing Speed Range", padding="5")
        speed_frame.pack(fill=tk.X, pady=5)
        
        # WPM inputs
        wpm_frame = ttk.Frame(speed_frame)
        wpm_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Min WPM
        min_frame = ttk.Frame(wpm_frame)
        min_frame.pack(side=tk.LEFT, padx=(0, 10))
        ttk.Label(min_frame, text="Min WPM:").pack(side=tk.LEFT)
        ttk.Entry(min_frame, textvariable=self.min_wpm, width=5).pack(side=tk.LEFT, padx=5)
        
        # Max WPM
        max_frame = ttk.Frame(wpm_frame)
        max_frame.pack(side=tk.LEFT)
        ttk.Label(max_frame, text="Max WPM:").pack(side=tk.LEFT)
        ttk.Entry(max_frame, textvariable=self.max_wpm, width=5).pack(side=tk.LEFT, padx=5)
        
        # Validate WPM inputs
        def validate_wpm(*args):
            try:
                min_wpm = self.min_wpm.get()
                max_wpm = self.max_wpm.get()
                if min_wpm > max_wpm:
                    messagebox.showerror("Invalid Input", "Minimum WPM must be less than or equal to Maximum WPM")
                    self.min_wpm.set(max_wpm)
            except tk.TclError:
                pass
        
        self.min_wpm.trace('w', validate_wpm)
        self.max_wpm.trace('w', validate_wpm)
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=10)
        
        # Start button
        self.start_button = ttk.Button(
            button_frame,
            text=f"Start ({self.start_key})",
            command=self.start_typing
        )
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        # Pause button
        self.pause_button = ttk.Button(
            button_frame,
            text=f"Pause ({self.pause_key})",
            command=self.toggle_pause,
            state=tk.DISABLED
        )
        self.pause_button.pack(side=tk.LEFT, padx=5)
        
        # Stop button
        self.stop_button = ttk.Button(
            button_frame,
            text=f"Stop ({self.stop_key})",
            command=self.stop_typing,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        # Instructions
        instructions = (
            "\nInstructions:\n"
            "1. Enter the text you want to type\n"
            "2. Set minimum and maximum WPM (60-80 recommended)\n"
            "3. Click Start or press F6\n"
            "4. Switch to your target window within 3 seconds\n"
            "5. Use F8 to pause/resume and F7 to stop"
        )
        ttk.Label(main_frame, text=instructions, justify=tk.LEFT).pack(pady=10)

    def setup_hotkeys(self):
        """Setup global hotkeys"""
        keyboard.add_hotkey(self.start_key, self.start_typing)
        keyboard.add_hotkey(self.stop_key, self.stop_typing)
        keyboard.add_hotkey(self.pause_key, self.toggle_pause)

    def calculate_delay(self):
        """Calculate delay between keystrokes with dynamic speed changes"""
        min_wpm = self.min_wpm.get()
        max_wpm = self.max_wpm.get()
        
        # Chance to change typing behavior
        if random.random() < self.speed_change_chance:
            # Decide whether to start a burst or change target speed
            if random.random() < 0.3:  # 30% chance for burst
                self.burst_mode = True
                self.target_wpm = max_wpm
                self.acceleration = 5.0  # Rapid acceleration
            else:
                self.burst_mode = False
                # Set new target speed anywhere in the range
                self.target_wpm = random.uniform(min_wpm, max_wpm)
                # Random acceleration between -2 and 2 WPM per character
                self.acceleration = random.uniform(-2.0, 2.0)
        
        # Update current speed based on acceleration and target
        if self.burst_mode:
            # Rapid approach to target during burst
            self.current_wpm = min(self.current_wpm + self.acceleration, self.target_wpm)
            if self.current_wpm >= self.target_wpm:
                self.burst_mode = False
                self.target_wpm = min_wpm  # Return to slower speed after burst
        else:
            # Gradual approach to target speed
            if abs(self.current_wpm - self.target_wpm) < 0.1:
                # Reached target, potentially set new target
                if random.random() < 0.2:  # 20% chance to change target
                    self.target_wpm = random.uniform(min_wpm, max_wpm)
            else:
                # Move toward target speed
                self.current_wpm += self.acceleration
                # Ensure speed stays within bounds
                self.current_wpm = max(min_wpm, min(self.current_wpm, max_wpm))
        
        # Convert current WPM to milliseconds per character
        chars_per_minute = self.current_wpm * 5
        base_delay = 60000 / chars_per_minute
        
        # Add micro variations (±10%)
        variation = base_delay * 0.1
        actual_delay = base_delay + random.uniform(-variation, variation)
        
        # Occasionally add "thinking" pauses mid-word (5% chance)
        if not self.burst_mode and random.random() < 0.05:
            actual_delay += random.uniform(100, 300)  # Add 0.1-0.3 second pause
            
        return actual_delay

    def start_typing(self):
        """Start the typing process"""
        if self.typing:
            return
            
        self.text_to_type = self.text_area.get("1.0", tk.END).strip()
        if not self.text_to_type:
            messagebox.showwarning("Warning", "Please enter text to type")
            return
            
        self.typing = True
        self.paused = False
        self.current_index = 0
        
        # Reset typing pattern variables
        self.current_wpm = (self.min_wpm.get() + self.max_wpm.get()) / 2  # Start at middle speed
        self.chars_typed_at_current_speed = 0
        self.words_typed_since_last_pause = 0
        self.next_pause_after_words = random.randint(1, 8)
        
        # Update UI
        self.start_button.config(state=tk.DISABLED)
        self.pause_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.NORMAL)
        self.status_label.config(text="Status: Starting...")
        
        # Start typing in a separate thread
        threading.Thread(target=self.type_text, daemon=True).start()
        
        # Start countdown
        self.countdown(3)

    def countdown(self, seconds):
        """Countdown before starting to type"""
        if seconds > 0:
            self.status_label.config(text=f"Starting in {seconds}...")
            self.root.after(1000, lambda: self.countdown(seconds - 1))
        else:
            self.status_label.config(text="Status: Typing...")

    def type_text(self):
        """Type out the text with random delays and word pauses"""
        time.sleep(3)  # Initial delay for countdown
        
        # Initialize word tracking
        current_word = []
        
        while self.current_index < len(self.text_to_type) and self.typing:
            if not self.paused:
                char = self.text_to_type[self.current_index]
                
                # Add character to current word
                if char.isalnum() or char in "'-":
                    current_word.append(char)
                else:
                    # Word boundary reached
                    if current_word:
                        self.words_typed_since_last_pause += 1
                        current_word = []
                        
                        # Check if we should pause after this word
                        if self.words_typed_since_last_pause >= self.next_pause_after_words:
                            # Type the space or punctuation first
                            pyautogui.write(char)
                            self.current_index += 1
                            
                            # Random pause between 1-3 seconds
                            pause_time = random.uniform(0.5, 3)
                            self.status_label.config(text="Status: Natural pause...")
                            time.sleep(pause_time)
                            self.status_label.config(text="Status: Typing...")
                            
                            # Reset counters
                            self.words_typed_since_last_pause = 0
                            self.next_pause_after_words = random.randint(1, 8)
                            continue
                
                # Type the character
                pyautogui.write(char)
                self.current_index += 1
                
                # Calculate and wait for the next character
                delay = self.calculate_delay()
                time.sleep(delay / 1000)  # Convert to seconds
            else:
                time.sleep(0.1)  # Reduced CPU usage while paused
                
        if self.current_index >= len(self.text_to_type):
            self.root.after(0, self.stop_typing)
            self.status_label.config(text="Status: Completed")

    def toggle_pause(self):
        """Toggle pause state"""
        if self.typing:
            self.paused = not self.paused
            self.pause_button.config(
                text=f"Resume ({self.pause_key})" if self.paused else f"Pause ({self.pause_key})"
            )
            self.status_label.config(
                text="Status: Paused" if self.paused else "Status: Typing..."
            )

    def stop_typing(self):
        """Stop the typing process"""
        self.typing = False
        self.paused = False
        
        # Reset UI
        self.start_button.config(state=tk.NORMAL)
        self.pause_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.DISABLED)
        self.pause_button.config(text=f"Pause ({self.pause_key})")
        if not self.status_label.cget("text") == "Status: Completed":
            self.status_label.config(text="Status: Ready")

    def run(self):
        """Start the application"""
        self.root.mainloop()

def main():
    try:
        app = AutoScribe()
        app.run()
    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()