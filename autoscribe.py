import tkinter as tk
from tkinter import ttk, messagebox
import tkinter.font as tkfont
import pyautogui
import time
import threading
import keyboard
import json
import random

# Ensure pyautogui is configured properly
pyautogui.FAILSAFE = True  # Move mouse to corner to abort
pyautogui.PAUSE = 0  # No delay between actions


class AutoScribe:
    def __init__(self):
        # ----- Colors inspired by your site -----
        self.COLOR_BG = "#0c0c0c"          # window background
        self.COLOR_CARD = "#121826"        # card/panel background
        self.COLOR_BORDER = "#1f2a44"
        self.COLOR_TEXT = "#e5e7eb"
        self.COLOR_MUTED = "#9ca3af"
        self.COLOR_ACCENT = "#40e0ff"
        self.COLOR_ACCENT2 = "#9a4dff"
        self.COLOR_SUCCESS_BG = "#0b3d3a"
        self.COLOR_SUCCESS_FG = "#34d399"
        self.COLOR_WARN_BG = "#3a2a0b"
        self.COLOR_WARN_FG = "#fbbf24"
        self.COLOR_INFO_BG = "#0b253a"
        self.COLOR_INFO_FG = "#60a5fa"

        # Initialize the main window
        self.root = tk.Tk()
        self.root.title("AutoScribe")
        self.root.geometry("460x640")
        self.root.minsize(440, 600)
        self.root.configure(bg=self.COLOR_BG)

        # Fonts
        self.font_main = tkfont.Font(family="Inter", size=10)
        self.font_title = tkfont.Font(family="Inter", size=14, weight="bold")
        self.font_small = tkfont.Font(family="Inter", size=9)

        # Apply ttk theme and styles
        self.style = ttk.Style(self.root)
        self.create_styles()

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

        # Mistake frequency: every N words (random between min/max)
        self.typo_min_words = tk.IntVar(value=5)   # Minimum words between corrections
        self.typo_max_words = tk.IntVar(value=12)  # Maximum words between corrections
        self.words_since_last_typo = 0
        self.next_typo_after_words = random.randint(self.typo_min_words.get(), self.typo_max_words.get())

        # Load settings and setup UI
        self.load_settings()
        self.setup_ui()
        self.setup_hotkeys()

    # ---------- Styles ----------
    def create_styles(self):
        # Use a themable engine
        try:
            self.style.theme_use("clam")
        except tk.TclError:
            pass

        # Base styles
        self.style.configure(".", background=self.COLOR_BG, foreground=self.COLOR_TEXT, font=self.font_main)

        # Frames / Cards
        self.style.configure("Card.TFrame", background=self.COLOR_CARD, borderwidth=1, relief="solid")
        self.style.configure("Main.TFrame", background=self.COLOR_BG)

        # Labels
        self.style.configure("Title.TLabel", background=self.COLOR_BG, foreground=self.COLOR_ACCENT, font=self.font_title)
        self.style.configure("Body.TLabel", background=self.COLOR_CARD, foreground=self.COLOR_TEXT, font=self.font_main)
        self.style.configure("Muted.TLabel", background=self.COLOR_CARD, foreground=self.COLOR_MUTED, font=self.font_small)

        # LabelFrame (group boxes)
        self.style.configure("Card.TLabelframe", background=self.COLOR_CARD, borderwidth=1, relief="solid")
        self.style.configure("Card.TLabelframe.Label", background=self.COLOR_CARD, foreground=self.COLOR_ACCENT, font=self.font_main)

        # Buttons
        # Accent button
        self.style.configure(
            "Accent.TButton",
            background=self.COLOR_ACCENT,
            foreground="#06131a",
            font=self.font_main,
            borderwidth=0,
            focusthickness=3,
            focuscolor=self.COLOR_ACCENT,
            padding=(12, 8),
        )
        self.style.map(
            "Accent.TButton",
            background=[
                ("active", "#7be9ff"),
                ("pressed", "#27c6e6"),
                ("disabled", "#2b3a44"),
            ],
            foreground=[("disabled", "#73808a")],
        )

        # Warn button
        self.style.configure(
            "Warn.TButton",
            background="#f59e0b",
            foreground="#1b1405",
            font=self.font_main,
            borderwidth=0,
            padding=(12, 8),
        )
        self.style.map(
            "Warn.TButton",
            background=[("active", "#fbbf24"), ("pressed", "#d97706"), ("disabled", "#2b3a44")],
            foreground=[("disabled", "#73808a")],
        )

        # Danger button
        self.style.configure(
            "Danger.TButton",
            background="#ef4444",
            foreground="#1b0b0b",
            font=self.font_main,
            borderwidth=0,
            padding=(12, 8),
        )
        self.style.map(
            "Danger.TButton",
            background=[("active", "#f87171"), ("pressed", "#dc2626"), ("disabled", "#2b3a44")],
            foreground=[("disabled", "#73808a")],
        )

        # Entry-like areas
        self.style.configure("Card.TEntry", fieldbackground=self.COLOR_CARD, background=self.COLOR_CARD, foreground=self.COLOR_TEXT)
        self.style.configure("CardHorizontal.TSeparator", background=self.COLOR_BORDER)

    def set_status(self, text, kind="info"):
        # Status chip style via colors
        if kind == "success":
            bg, fg, bd = self.COLOR_SUCCESS_BG, self.COLOR_SUCCESS_FG, "#22544f"
        elif kind == "warn":
            bg, fg, bd = self.COLOR_WARN_BG, self.COLOR_WARN_FG, "#5d4414"
        else:
            bg, fg, bd = self.COLOR_INFO_BG, self.COLOR_INFO_FG, "#143451"

        def apply():
            self.status_label.config(text=text, background=bg, foreground=fg, bd=1, relief="solid", highlightthickness=0)
            self.status_label_frame.config(background=self.COLOR_BG)
        self.root.after(0, apply)

    # ---------- Settings ----------
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

    # ---------- UI ----------
    def setup_ui(self):
        container = ttk.Frame(self.root, style="Main.TFrame", padding=12)
        container.pack(fill=tk.BOTH, expand=True)

        # Header
        header = ttk.Frame(container, style="Main.TFrame")
        header.pack(fill=tk.X, pady=(0, 10))
        title = ttk.Label(header, text="AutoScribe", style="Title.TLabel")
        title.pack(side=tk.LEFT)
        subtitle = ttk.Label(header, text="Human-like automated typing", style="Muted.TLabel")
        subtitle.pack(side=tk.LEFT, padx=(10, 0))

        # Status chip
        self.status_label_frame = ttk.Frame(container, style="Main.TFrame")
        self.status_label_frame.pack(fill=tk.X)
        self.status_label = tk.Label(self.status_label_frame, text="Status: Ready", bg=self.COLOR_INFO_BG, fg=self.COLOR_INFO_FG, padx=10, pady=6)
        self.status_label.pack(side=tk.LEFT, padx=(0, 0), pady=(0, 8))
        ttk.Separator(container, orient="horizontal", style="CardHorizontal.TSeparator").pack(fill=tk.X, pady=(6, 12))

        # Card: Text input
        text_card = ttk.Labelframe(container, text="Text to type", style="Card.TLabelframe")
        text_card.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        text_inner = ttk.Frame(text_card, style="Card.TFrame", padding=8)
        text_inner.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        self.text_area = tk.Text(
            text_inner,
            height=9,
            wrap="word",
            bg=self.COLOR_BG,
            fg=self.COLOR_TEXT,
            insertbackground=self.COLOR_ACCENT,
            relief="flat",
            highlightthickness=1,
            highlightbackground=self.COLOR_BORDER,
            highlightcolor=self.COLOR_ACCENT,
            padx=8,
            pady=8
        )
        self.text_area.pack(fill=tk.BOTH, expand=True)

        # Card: Speed
        speed_card = ttk.Labelframe(container, text="Typing Speed Range", style="Card.TLabelframe")
        speed_card.pack(fill=tk.X, pady=(0, 10))
        speed_inner = ttk.Frame(speed_card, style="Card.TFrame", padding=8)
        speed_inner.pack(fill=tk.X, padx=8, pady=8)

        min_frame = ttk.Frame(speed_inner, style="Card.TFrame")
        min_frame.pack(side=tk.LEFT, padx=(0, 16))
        ttk.Label(min_frame, text="Min WPM:", style="Body.TLabel").pack(side=tk.LEFT)
        ttk.Entry(min_frame, textvariable=self.min_wpm, width=6).pack(side=tk.LEFT, padx=6)

        max_frame = ttk.Frame(speed_inner, style="Card.TFrame")
        max_frame.pack(side=tk.LEFT)
        ttk.Label(max_frame, text="Max WPM:", style="Body.TLabel").pack(side=tk.LEFT)
        ttk.Entry(max_frame, textvariable=self.max_wpm, width=6).pack(side=tk.LEFT, padx=6)

        # Validate WPM inputs
        def validate_wpm(*args):
            try:
                min_wpm_val = self.min_wpm.get()
                max_wpm_val = self.max_wpm.get()
                if min_wpm_val > max_wpm_val:
                    self.min_wpm.set(max_wpm_val)
                if min_wpm_val < 1:
                    self.min_wpm.set(1)
                if max_wpm_val < 1:
                    self.max_wpm.set(1)
            except tk.TclError:
                pass
        self.min_wpm.trace('w', validate_wpm)
        self.max_wpm.trace('w', validate_wpm)

        # Card: Mistake frequency
        typo_card = ttk.Labelframe(container, text="Mistake Frequency (delete and correct)", style="Card.TLabelframe")
        typo_card.pack(fill=tk.X, pady=(0, 10))
        typo_inner = ttk.Frame(typo_card, style="Card.TFrame", padding=8)
        typo_inner.pack(fill=tk.X, padx=8, pady=8)

        ttk.Label(typo_inner, text="Mistake every", style="Body.TLabel").pack(side=tk.LEFT)
        ttk.Entry(typo_inner, textvariable=self.typo_min_words, width=4).pack(side=tk.LEFT, padx=(6, 4))
        ttk.Label(typo_inner, text="to", style="Body.TLabel").pack(side=tk.LEFT)
        ttk.Entry(typo_inner, textvariable=self.typo_max_words, width=4).pack(side=tk.LEFT, padx=(4, 6))
        ttk.Label(typo_inner, text="words (random)", style="Muted.TLabel").pack(side=tk.LEFT)

        def validate_typo_words(*args):
            try:
                minw = self.typo_min_words.get()
                maxw = self.typo_max_words.get()
                if minw < 1:
                    self.typo_min_words.set(1); minw = 1
                if maxw < 1:
                    self.typo_max_words.set(1); maxw = 1
                if minw > maxw:
                    self.typo_min_words.set(maxw)
            except tk.TclError:
                pass
        self.typo_min_words.trace('w', validate_typo_words)
        self.typo_max_words.trace('w', validate_typo_words)

        # Controls
        controls = ttk.Frame(container, style="Main.TFrame")
        controls.pack(fill=tk.X, pady=(6, 0))

        self.start_button = ttk.Button(controls, text=f"Start ({self.start_key})", style="Accent.TButton", command=self.start_typing)
        self.start_button.pack(side=tk.LEFT, padx=(0, 8))

        self.pause_button = ttk.Button(controls, text=f"Pause ({self.pause_key})", style="Warn.TButton", command=self.toggle_pause, state=tk.DISABLED)
        self.pause_button.pack(side=tk.LEFT, padx=(0, 8))

        self.stop_button = ttk.Button(controls, text=f"Stop ({self.stop_key})", style="Danger.TButton", command=self.stop_typing, state=tk.DISABLED)
        self.stop_button.pack(side=tk.LEFT)

        # Footer / Instructions
        footer = ttk.Frame(container, style="Main.TFrame")
        footer.pack(fill=tk.BOTH, expand=True)
        instructions = (
            "Tips:\n"
            "• Switch to target window within 3 seconds after Start\n"
            "• F8 toggles pause; F7 stops\n"
            "• Use the Mistake Frequency to tune how often corrections happen"
        )
        footer_card = ttk.Labelframe(footer, text="Instructions", style="Card.TLabelframe")
        footer_card.pack(fill=tk.BOTH, expand=True, pady=12)
        footer_inner = ttk.Frame(footer_card, style="Card.TFrame", padding=10)
        footer_inner.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)
        ttk.Label(footer_inner, text=instructions, style="Muted.TLabel", justify=tk.LEFT).pack(anchor="w")

        # Initial status look
        self.set_status("Status: Ready", kind="info")

    # ---------- Hotkeys ----------
    def setup_hotkeys(self):
        """Setup global hotkeys"""
        keyboard.add_hotkey(self.start_key, self.start_typing)
        keyboard.add_hotkey(self.stop_key, self.stop_typing)
        keyboard.add_hotkey(self.pause_key, self.toggle_pause)

    # ---------- Timing ----------
    def calculate_delay(self):
        """Calculate delay between keystrokes with dynamic speed changes (returns milliseconds)"""
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
            self.current_wpm = min(self.current_wpm + self.acceleration, self.target_wpm)
            if self.current_wpm >= self.target_wpm:
                self.burst_mode = False
                self.target_wpm = min_wpm  # Return to slower speed after burst
        else:
            if abs(self.current_wpm - self.target_wpm) < 0.1:
                if random.random() < 0.2:  # 20% chance to change target
                    self.target_wpm = random.uniform(min_wpm, max_wpm)
            else:
                self.current_wpm += self.acceleration
                self.current_wpm = max(min_wpm, min(self.current_wpm, max_wpm))

        # Convert current WPM to milliseconds per character
        chars_per_minute = max(5, self.current_wpm * 5)
        base_delay = 60000 / chars_per_minute

        # Add micro variations (±10%)
        variation = base_delay * 0.1
        actual_delay = base_delay + random.uniform(-variation, variation)

        # Occasionally add "thinking" pauses mid-word (5% chance)
        if not self.burst_mode and random.random() < 0.05:
            actual_delay += random.uniform(100, 300)  # Add 0.1-0.3 second pause

        return actual_delay

    # ---------- Human-like typo helpers ----------
    def _keyboard_neighbors(self):
        # QWERTY adjacency (lowercase; case restored later)
        return {
            'q': ['w', 'a'],
            'w': ['q', 'e', 'a', 's'],
            'e': ['w', 'r', 's', 'd'],
            'r': ['e', 't', 'd', 'f'],
            't': ['r', 'y', 'f', 'g'],
            'y': ['t', 'u', 'g', 'h'],
            'u': ['y', 'i', 'h', 'j'],
            'i': ['u', 'o', 'j', 'k'],
            'o': ['i', 'p', 'k', 'l'],
            'p': ['o', 'l'],

            'a': ['q', 'w', 's', 'z'],
            's': ['w', 'e', 'a', 'd', 'z', 'x'],
            'd': ['e', 'r', 's', 'f', 'x', 'c'],
            'f': ['r', 't', 'd', 'g', 'c', 'v'],
            'g': ['t', 'y', 'f', 'h', 'v', 'b'],
            'h': ['y', 'u', 'g', 'j', 'b', 'n'],
            'j': ['u', 'i', 'h', 'k', 'n', 'm'],
            'k': ['i', 'o', 'j', 'l', 'm'],
            'l': ['o', 'p', 'k'],

            'z': ['a', 's', 'x'],
            'x': ['s', 'd', 'z', 'c'],
            'c': ['d', 'f', 'x', 'v'],
            'v': ['f', 'g', 'c', 'b'],
            'b': ['g', 'h', 'v', 'n'],
            'n': ['h', 'j', 'b', 'm'],
            'm': ['j', 'k', 'n'],

            '1': ['2'],
            '2': ['1', '3'],
            '3': ['2', '4'],
            '4': ['3', '5'],
            '5': ['4', '6'],
            '6': ['5', '7'],
            '7': ['6', '8'],
            '8': ['7', '9'],
            '9': ['8', '0'],
            '0': ['9']
        }

    def _neighbor_for_char(self, ch):
        """Return a nearby key for ch (preserving case) or None"""
        neighbors = self._keyboard_neighbors()
        is_upper = ch.isalpha() and ch.isupper()
        base = ch.lower()
        if base in neighbors and neighbors[base]:
            cand = random.choice(neighbors[base])
            return cand.upper() if is_upper else cand
        return None

    def _press_backspaces(self, count):
        """Backspace with varied delays; respects pause state"""
        for _ in range(count):
            while self.paused and self.typing:
                time.sleep(0.05)
            pyautogui.press('backspace')
            delay_ms = max(25, self.calculate_delay() * 0.5)
            time.sleep(delay_ms / 1000.0)

    # ---------- Control flow ----------
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
        self.words_typed_since_last_pause = 0
        self.next_pause_after_words = random.randint(1, 8)

        # Reset mistake schedule
        self.words_since_last_typo = 0
        minw = max(1, self.typo_min_words.get())
        maxw = max(minw, self.typo_max_words.get())
        self.next_typo_after_words = random.randint(minw, maxw)

        # Update UI
        self.start_button.config(state=tk.DISABLED)
        self.pause_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.NORMAL)
        self.set_status("Status: Starting...", kind="info")

        # Start typing in a separate thread
        threading.Thread(target=self.type_text, daemon=True).start()

        # Start countdown
        self.countdown(3)

    def countdown(self, seconds):
        """Countdown before starting to type"""
        if seconds > 0:
            self.set_status(f"Starting in {seconds}...", kind="info")
            self.root.after(1000, lambda: self.countdown(seconds - 1))
        else:
            self.set_status("Status: Typing...", kind="info")

    def type_text(self):
        """Type text with random delays and scheduled 'mistype then correct' behavior."""
        time.sleep(3)  # Initial delay for countdown

        # Track current word and typo plan
        current_word_correct = []     # Intended correct characters for the current word
        typed_word_len = 0            # How many chars actually typed for this word (including the typo)
        typo_planned = False          # Whether this word should get a typo
        typo_introduced = False       # Whether we've already injected the typo in this word

        def is_word_char(c):
            return c.isalnum() or c in "'-"

        while self.current_index < len(self.text_to_type) and self.typing:
            if self.paused:
                time.sleep(0.1)
                continue

            char = self.text_to_type[self.current_index]

            if is_word_char(char):
                # Starting a new word? If so, decide if this word should get a typo based on schedule
                if not current_word_correct:
                    typo_planned = (self.words_since_last_typo >= self.next_typo_after_words)
                    typo_introduced = False
                    typed_word_len = 0

                # Try to introduce exactly one neighbor-key mistake in this word
                out_char = char
                if typo_planned and not typo_introduced:
                    neighbor = self._neighbor_for_char(char)
                    if neighbor and neighbor != char:
                        out_char = neighbor
                        typo_introduced = True

                pyautogui.write(out_char)
                self.current_index += 1
                typed_word_len += 1
                current_word_correct.append(char)

                delay = self.calculate_delay()
                time.sleep(delay / 1000.0)

            else:
                # Word boundary (space/punct/newline)
                if current_word_correct:
                    self.words_typed_since_last_pause += 1

                    if typo_planned and typo_introduced:
                        # Perform correction sequence
                        if char.isspace():
                            # Many people notice right after hitting the space
                            pyautogui.write(char)
                            self.current_index += 1
                            time.sleep(random.uniform(0.05, 0.2))
                            # Delete space + word, then retype correctly, then space
                            self._press_backspaces(1 + typed_word_len)
                            for cc in current_word_correct:
                                pyautogui.write(cc)
                                time.sleep(self.calculate_delay() / 1000.0)
                            pyautogui.write(' ')
                        else:
                            # Punctuation: correct before committing punctuation
                            self._press_backspaces(typed_word_len)
                            for cc in current_word_correct:
                                pyautogui.write(cc)
                                time.sleep(self.calculate_delay() / 1000.0)
                            pyautogui.write(char)
                            self.current_index += 1

                        # Reset mistake schedule after a correction
                        self.words_since_last_typo = 0
                        minw = max(1, self.typo_min_words.get())
                        maxw = max(minw, self.typo_max_words.get())
                        self.next_typo_after_words = random.randint(minw, maxw)
                    else:
                        # No typo on this word: just type the boundary
                        pyautogui.write(char)
                        self.current_index += 1
                        # Count this word toward the next scheduled typo
                        self.words_since_last_typo += 1

                    # Natural word-level pause after boundary/correction
                    if self.words_typed_since_last_pause >= self.next_pause_after_words:
                        pause_time = random.uniform(0.5, 3.0)
                        self.set_status("Status: Natural pause...", kind="info")
                        time.sleep(pause_time)
                        self.set_status("Status: Typing...", kind="info")
                        self.words_typed_since_last_pause = 0
                        self.next_pause_after_words = random.randint(1, 8)

                    # Reset word trackers
                    current_word_correct = []
                    typed_word_len = 0
                    typo_planned = False
                    typo_introduced = False
                else:
                    # Not in a word; just type boundary and continue
                    pyautogui.write(char)
                    self.current_index += 1
                    time.sleep(self.calculate_delay() / 1000.0)

        # If text ended right after a typo word (no boundary), correct it now
        if current_word_correct and typo_planned and typo_introduced:
            self._press_backspaces(typed_word_len)
            for cc in current_word_correct:
                pyautogui.write(cc)
                time.sleep(self.calculate_delay() / 1000.0)
            # Reset schedule since we just corrected
            self.words_since_last_typo = 0
            minw = max(1, self.typo_min_words.get())
            maxw = max(minw, self.typo_max_words.get())
            self.next_typo_after_words = random.randint(minw, maxw)

        if self.current_index >= len(self.text_to_type):
            self.root.after(0, lambda: self.set_status("Status: Completed", kind="success"))
            self.root.after(0, self.stop_typing)

    def toggle_pause(self):
        """Toggle pause state"""
        if self.typing:
            self.paused = not self.paused
            self.pause_button.config(
                text=f"Resume ({self.pause_key})" if self.paused else f"Pause ({self.pause_key})"
            )
            if self.paused:
                self.set_status("Status: Paused", kind="warn")
            else:
                self.set_status("Status: Typing...", kind="info")

    def stop_typing(self):
        """Stop the typing process"""
        self.typing = False
        self.paused = False

        # Reset UI
        self.start_button.config(state=tk.NORMAL)
        self.pause_button.config(state=tk.DISABLED, text=f"Pause ({self.pause_key})")
        self.stop_button.config(state=tk.DISABLED)
        # Preserve 'Completed' status if already set, otherwise Ready
        if not self.status_label.cget("text").endswith("Completed"):
            self.set_status("Status: Ready", kind="info")

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