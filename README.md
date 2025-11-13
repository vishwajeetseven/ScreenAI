# ScreenAI (Google Chrome Extension)

<img width="1366" height="768" alt="Screenshot 2025-11-13 163704" src="https://github.com/user-attachments/assets/7ea90ed7-656b-4fa6-9744-67f9fcbad65c" />



### Load Extension (Developer Mode)
Open Chrome → Go to:

```chrome://extensions/```

Enable Developer Mode (top-right toggle).

Click Load unpacked.

Select the extension folder (the folder containing manifest.json, background.js, and content.js)

Now the extension will load immediately.


### First-Time Setup (API Keys)
After loading the extension, you must add your API keys to use the AI features.

1.  Click the **ScreenAI icon** in your Chrome toolbar. (You may need to click the "Extensions" puzzle icon and "pin" ScreenAI to make it visible).
2.  This will open the **ScreenAI Settings** page.
3.  Paste your **Google AI API Key** into the first box.
4.  Paste your **OCR.space API Key** into the second box. (The free key is fine).
5.  Click **Save Keys**.

### A Note on APIs
This extension is built using the free API keys and tiers provided by Google AI and OCR.space. This makes it a great starting point, and new features can be easily added by extending the existing API functions in `background.js`.

### Usage
There are several ways to activate the AI assistant:

1.  **Keyboard Shortcut:**
    * Press **`Ctrl + Shift + X`** to open the AI modal.
    * If you have text selected on the page, it will automatically analyze that text.

2.  **Context Menu (Right-Click):**
    * **On selected text:** Right-click and choose "Send selected text to AI".
    * **On an image:** Right-click and choose "Analyze image with AI".

3.  **Inside the AI Modal:**
    * **Upload Image:** Click the `+` icon to upload an image file from your computer.
    * **Take Screenshot:** Click the "crop" icon to snip a part of your screen. The AI will extract the text (OCR).
    * **Paste Image:** You can paste an image directly into the text box.
    * **Process Text:** After a screenshot, click "Process with AI" to ask questions about the extracted text.

---

### Architecture
This extension uses an event-driven architecture with a central background script and a UI-controller script.

* **`manifest.json`**: The core "blueprint" of the extension. It defines permissions, registers the keyboard shortcut, and tells Chrome to run `background.js` as a service worker.

* **`background.js` (Service Worker)**: This is the **central hub** and event controller.
    * It listens for all browser events (like a key-press or context menu click).
    * It makes all external API calls to Google AI and OCR.space.
    * It manages script injection, injecting `content.js` and `snipper.js` when needed.
    * It acts as the single point of communication between all other parts of the extension.

* **`content.js`**: This is the **front-end and user interface**.
    * It is injected into the active web page to create, display, and manage the draggable AI modal.
    * It handles all user interactions *within* the modal (typing, button clicks, image pasting).
    * It sends messages to `background.js` (e.g., "user asked a follow-up") and receives responses (e.g., "here is the AI answer") to display.

* **`snipper.js`**: This is a **temporary, single-purpose tool**.
    * It is injected only when the user clicks the "snip" icon.
    * It creates the screen overlay and allows the user to draw a selection box.
    * Once a region is selected, it sends a message with the coordinates to `background.js` and removes itself from the page.

* **`options.html` / `options.js`**: A simple settings page that allows the user to save API keys, which are stored securely using `chrome.storage.local`.

#### API Architecture
All API calls are handled securely within the `background.js` service worker.

1.  **Google AI (Gemini)**:
    * This API handles all generative AI and vision tasks, managed by the `callGoogleAI` function.
    * **Text/Chat:** For text prompts and follow-ups, the extension uses the **`gemini-2.5-flash`** model for speed.
    * **Image Analysis:** For right-clicked images, the extension uses the **`gemini-2.5-pro`** (vision) model.
    * The `background.js` script formats the chat history into the Google `contents` format before sending the request.

2.  **OCR.space**:
    * This API is used exclusively for Optical Character Recognition (extracting text from images).
    * It is managed by the `callOcrSpace` function.
    * When a user takes a screenshot, the image data is sent to this API.
    * The API returns only the extracted text, which is then sent to `content.js` to be displayed.

#### Example Data Flow (Screenshot)
1.  **User** clicks the "snip" icon in the **`content.js`** modal.
2.  **`content.js`** sends a message: `{type: 'initiateScreenshot'}` to `background.js`.
3.  **`background.js`** receives this message and injects **`snipper.js`** into the current tab.
4.  **`snipper.js`** activates, creating the overlay. The user draws a box.
5.  **`snipper.js`** sends a message: `{type: 'captureRegion', ...coordinates}` to `background.js` and cleans itself up.
6.  **`background.js`** receives the coordinates, captures the visible tab, crops the image, and sends the image data to the `callOcrSpace` function.
7.  The OCR.space API returns text.
8.  **`background.js`** sends a final message: `{type: 'showOcrResult', text: '...'}` to **`content.js`**.
9.  **`content.js`** receives the text and displays it in the modal's chat window.

Note: This is temporary. Chrome might disable it on restart unless developer mode is enabled.
