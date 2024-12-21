# CLUT: Cycle Last Used Tabs

Cycle through your most recently used Chrome tabs using convenient keyboard shortcuts. CLUT mimics the classic Windows <kbd>Alt+Tab</kbd> (or Mac <kbd>Cmd+Tab</kbd>) behavior so you can switch tabs in a snappy, intuitive manner.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
  - [Option A: Chrome Web Store](#option-a-chrome-web-store)
  - [Option B: From Source (Unpacked)](#option-b-from-source-unpacked)
- [Usage](#usage)
  - [Default Keyboard Shortcuts](#default-keyboard-shortcuts)
  - [Changing Shortcuts](#changing-shortcuts)
  - [Quick Switch vs. Normal Switch](#quick-switch-vs-normal-switch)
- [Development & Contributing](#development--contributing)
- [License](#license)
- [FAQ](#faq)

---

## Overview
CLUT (Cycle Last Used Tabs) keeps track of the order in which you activate your tabs. You can switch to your previously used tabs with simple keyboard shortcuts. This is particularly helpful if you often jump back and forth between a few key tabs, as you would with <kbd>Alt+Tab</kbd> in Windows or <kbd>Cmd+Tab</kbd> on Mac.

---

## Features
- **MRU (Most Recently Used) Tab Switching**  
  Quickly cycle through all open tabs across all Chrome windows in the order you last used them.
- **Low Permissions**  
  Requires only the `tabs` and `storage` permissions. Does not read or store browsing data.
- **Fast & Simple**  
  Uses straightforward timing logic to differentiate between quick and normal switching.
- **Multiple Windows Supported**  
  Seamlessly switch between tabs located in different Chrome windows.
- **Customizable Shortcuts**  
  You can remap the default shortcuts via `chrome://extensions/shortcuts`.

---

## Installation

### Option A: Chrome Web Store
1. Visit the extension’s [Chrome Web Store page](#) (URL will be provided once published).
2. Click **Add to Chrome**.
3. Grant the minimal permissions required.
4. Done! Set your preferred shortcuts at `chrome://extensions/shortcuts` (optional step).

### Option B: From Source (Unpacked)
1. **Download/Clone** this repository from [GitHub](https://github.com/bluman1/clut.git).
2. Ensure you have the Manifest V3 code in a folder (e.g., `clut-updated/`) that includes:
   - `manifest.json`
   - `background.js`
   - Icons (`icon16.png`, `icon48.png`, `icon128.png`)
3. Go to `chrome://extensions` in Chrome.
4. Enable **Developer Mode** (toggle in the upper right).
5. Click **Load unpacked** and select the folder where your files are located.
6. You can now set the shortcuts and start using the extension.

---

## Usage

### Default Keyboard Shortcuts
- **Quick Switch**: <kbd>Alt+W</kbd> (Windows) or <kbd>Option+W</kbd> (Mac)  
  Press once to jump back to your most recently used tab. Press multiple times quickly to cycle further back.
- **Normal Switch (Backward)**: <kbd>Alt+S</kbd> (Windows) or <kbd>Option+S</kbd> (Mac)
- **Normal Switch (Forward)**: <kbd>Alt+Shift+S</kbd> (Windows) or <kbd>Option+Shift+S</kbd> (Mac)

> *Note*: Chrome may prevent certain system-level shortcuts from being remapped.

### Changing Shortcuts
1. Navigate to `chrome://extensions/shortcuts`.
2. Find **CLUT: Cycle Last Used Tabs** in the list.
3. Click the shortcut fields to enter your desired key combinations.

### Quick Switch vs. Normal Switch
- **Quick Switch**  
  For rapidly jumping to a recently used tab. It uses a shorter time interval to detect multiple presses in quick succession.
- **Normal Switch**  
  Ideal for slower cycling if you need to glance at each tab before deciding to keep switching.

---

## Development & Contributing

1. **Fork or Clone** the repo from [GitHub](https://github.com/bluman1/clut.git).
2. Make changes or bugfixes in your local branch.
3. Submit a Pull Request describing your enhancements or fixes.

### Project Structure
```
clut-updated/
├── manifest.json     // Manifest V3
├── background.js     // Service worker logic for tab switching
├── icon16.png
├── icon48.png
├── icon128.png
```

### Debugging Tips
- Set `loggingOn = true;` in `background.js` to see console logs.
- Open the extension’s **Service Worker** console via `chrome://extensions/` → “Service Worker” link under the CLUT extension card.

---

## License
This project is licensed under the [MIT License](LICENSE). You are free to fork and modify the extension as long as you include the original license.

---

## FAQ
1. **Why is there a separate quick switch and normal switch?**  
   Due to certain Chrome API limitations, CLUT relies on time intervals to differentiate quick vs. slower tab cycling. This approach ensures you can switch quickly with rapid presses or methodically check each tab at a leisurely pace.
2. **Why can’t I set a particular key combination?**  
   Chrome disallows some shortcuts if they overlap with system-level commands or reserved browser shortcuts.
3. **Does this extension collect my browsing data?**  
   No. It only needs `tabs` permission to reorder your tabs. No site data is read or stored remotely.
4. **I encountered a bug or want a new feature. Where can I report it?**  
   Please open an [issue on GitHub](https://github.com/bluman1/clut/issues) or create a Pull Request if you have a fix.

If you have any other questions, feel free to reach out via GitHub or the Support contact in the Web Store listing. Enjoy faster tab switching!