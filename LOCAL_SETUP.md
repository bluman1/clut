# Local Setup Guide for CLUT Extension

Follow these steps to load and run the CLUT extension directly from the source code on your local machine.

1.  **Navigate to Extensions:**
    *   Open Google Chrome.
    *   Go to the address: `chrome://extensions`

2.  **Enable Developer Mode:**
    *   Look for the **Developer mode** toggle switch, usually located in the top-right corner of the `chrome://extensions` page.
    *   Make sure this switch is **enabled** (turned on).

3.  **Load Unpacked Extension:**
    *   Click the **Load unpacked** button (usually found near the top-left).
    *   A file browser dialog will appear.
    *   Navigate to the directory where you have the CLUT source code (this folder: `/Users/michael/WebstormProjects/clut/`).
    *   Select the **entire folder** (the one containing `manifest.json`, `background.js`, etc.) and click "Select" or "Open".

4.  **Verify Installation:**
    *   The **CLUT: Cycle Last Used Tabs** extension should now appear in your list of installed extensions.
    *   Check its card for any error messages (there shouldn't be any if the files are correct).

5.  **Reloading After Changes:**
    *   If you make changes to the code (like `background.js`), you need to reload the extension for the changes to take effect.
    *   Go back to `chrome://extensions`.
    *   Find the CLUT extension card.
    *   Click the **reload icon** (a circular arrow 🔄).

6.  **Configure Shortcuts (Optional):**
    *   To set or change the keyboard shortcuts:
    *   Navigate to `chrome://extensions/shortcuts`.
    *   Find **CLUT: Cycle Last Used Tabs** in the list.
    *   Click the input fields next to the commands (e.g., "Quick Switch") and press your desired key combination. You may use Opt+W as your shortcut.

The extension is now running locally from your source code folder!
