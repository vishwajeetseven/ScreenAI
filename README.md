<p align="center">
  <img src="icon.png" width="128" alt="ScreenAI Logo">
  <h1 align="center">ScreenAI</h1>
</p>

<p align="center">
  Your "Bring-Your-Own-Key" AI assistant for Google Chrome.
  <br />
  Right-click images for vision analysis, capture your screen for OCR, and get AI help without a subscription.
  <br />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg">
</p>

---

ScreenAI is a powerful, privacy-first Chrome extension that integrates Gemini and OCR capabilities directly into your browser. You can analyze images on the web, extract text from any part of your screen, and get AI assistance on any page.

Because it's a "Bring-Your-Own-Key" (BYOK) tool, you have full control. There are no subscriptions and no third-party data logging.

## Key Features

* **Context-Aware AI:** Press **`Ctrl+Shift+X`** to analyze selected text or right-click any text/image to send it to the AI.
* **Screenshot OCR:** Snip any part of your screen, instantly extract the text, and then process that text with the AI.
* **Image Analysis:** Right-click any image on the web to ask questions about it, powered by the Gemini 2.5 Pro vision model.
* **Paste & Upload:** Paste an image directly into the chat or upload one from your computer for analysis.
* **Privacy-First:** All API calls use your *own* keys. Your data is your own.

## Screenshot

<img width="1366" height="768" alt="ScreenAI Screenshot" src="https://github.com/user-attachments/assets/7ea90ed7-656b-4fa6-9744-67f9fcbad65c" />

## Installation & Setup

This extension is not yet on the Chrome Web Store. To install it, you must load it in Developer Mode.

### 1. Load the Extension
1.  Download this repository as a ZIP file and unzip it.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** (top-right toggle).
4.  Click **Load unpacked**.
5.  Select the unzipped folder (the one containing `manifest.json`). The extension will load immediately.

### 2. Add Your API Keys
After loading, you *must* add your API keys to use the AI features.

1.  Click the **ScreenAI icon** in your Chrome toolbar. (You may need to pin it first).
2.  This opens the **ScreenAI Settings** page.
3.  Paste your **Google AI API Key** (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)).
4.  Paste your **OCR.space API Key** (get a free one at [ocr.space](https://ocr.space/ocrapi)).
5.  Click **Save Keys**.

## How to Use

There are several ways to activate the AI assistant:

1.  **Keyboard Shortcut:**
    * Press **`Ctrl + Shift + X`** to open the AI modal.
    * If you have text selected, it will automatically analyze that text.

2.  **Context Menu (Right-Click):**
    * **On selected text:** Right-click and choose "Send selected text to AI".
    * **On an image:** Right-click and choose "Analyze image with AI".

3.  **Inside the AI Modal:**
    * **Upload Image:** Click the `+` icon to upload an image from your computer.
    * **Take Screenshot:** Click the "crop" icon to snip a part of your screen.
    * **Paste Image:** You can paste an image directly into the text box.
    * **Process Text:** After a screenshot, click "Process with AI" to ask questions about the extracted text.

// ## For Developers & Contributors

// We welcome contributions! Please feel free to open an Issue or Pull Request.

<details>
<summary><b>Click to expand: Project Architecture & Data Flow</b></summary>
<br />

This extension uses an event-driven architecture with a central background script and a UI-controller script.

* **`manifest.json`**: The core "blueprint." It defines permissions, registers the keyboard shortcut, and tells Chrome to run `background.js` as a service worker.
* **`background.js` (Service Worker)**: This is the **central hub** and event controller. It listens for all browser events, makes all external API calls (to Google AI and OCR.space), and manages script injection.
* **`content.js`**: This is the **front-end and user interface**. It is injected into the active web page to create, display, and manage the draggable AI modal.
* **`snipper.js`**: A **temporary, single-purpose tool**. It is injected only when the user clicks the "snip" icon to create the screen overlay and draw a selection box.
* **`options.html` / `options.js`**: A simple settings page that allows the user to save API keys to `chrome.storage.local`.

#### API Architecture
All API calls are handled securely within the `background.js` service worker.

1.  **Google AI (Gemini)**:
    * **Text/Chat:** For text prompts and follow-ups, the extension uses the **`gemini-2.5-flash`** model for speed.
    * **Image Analysis:** For right-clicked images, the extension uses the **`gemini-2.5-pro`** (vision) model.

2.  **OCR.space**:
    * This API is used exclusively for Optical Character Recognition (extracting text from screenshots). It is managed by the `callOcrSpace` function.

#### Example Data Flow (Screenshot)
1.  **User** clicks the "snip" icon in the **`content.js`** modal.
2.  **`content.js`** sends a message: `{type: 'initiateScreenshot'}` to `background.js`.
3.  **`background.js`** receives this message and injects **`snipper.js`**.
4.  **`snipper.js`** activates. The user draws a box and `snipper.js` sends a message: `{type: 'captureRegion', ...coordinates}` to `background.js`.
5.  **`background.js`** receives the coordinates, captures the visible tab, crops the image, and sends the image data to the `callOcrSpace` function.
6.  The OCR.space API returns text.
7.  **`background.js`** sends a final message: `{type: 'showOcrResult', text: '...'}` to **`content.js`**.
8.  **`content.js`** receives the text and displays it in the modal's chat window.

</details>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
