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

* **Context-Aware AI:** Press **`Ctrl+Shift+X`** to analyze selected text, or right-click any text/image to send it to the AI.
* **Quick Actions:** Right-click selected text for "Summarize", "Explain", or "Translate". Right-click anywhere for "Summarize this page".
* **Screenshot OCR:** Snip any part of your screen, instantly extract the text, and then process that text with the AI.
* **Image Analysis:** Right-click any image to ask questions about it, powered by a configurable vision model.
* **Paste & Upload:** Paste an image directly into the chat, drag-and-drop an image onto the modal, or upload one from your computer.
* **Regenerate Responses:** Not happy with an answer? Click the refresh icon on any assistant message to regenerate it.
* **New Chat:** Start a fresh conversation anytime with the `+` button.
* **Custom System Prompt:** Give the AI a persona or rules from the Options page.
* **Dark Mode:** Automatically respects your OS `prefers-color-scheme`.
* **Export / Import Settings:** Back up and restore your config with a single click.
* **Privacy-First:** All API calls use your *own* keys. Your data is your own.

## Screenshot

![Uploading image.png…]()

<!-- <img width="1366" height="768" alt="ScreenAI Screenshot" src="https://github.com/user-attachments/assets/7ea90ed7-656b-4fa6-9744-67f9fcbad65c" /> -->

## Installation & Setup

This extension is not on the Chrome Web Store. To install it, load it in Developer Mode.

### 1. Load the Extension
1.  Download this repository as a ZIP file and unzip it.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** (top-right toggle).
4.  Click **Load unpacked**.
5.  Select the unzipped folder (the one containing `manifest.json`).

### 2. Add Your API Keys
1.  Click the **ScreenAI icon** in your Chrome toolbar.
2.  Paste your **Google AI API Key** (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)).
3.  Paste your **OCR.space API Key** (get a free one at [ocr.space](https://ocr.space/ocrapi)).
4.  *(Optional)* Choose your OCR language, text model, vision model, and custom system prompt.
5.  Use the **Test** buttons to verify each key works.
6.  Click **Save Settings**.

## How to Use

1.  **Keyboard Shortcut:**
    * Press **`Ctrl + Shift + X`** to open the AI modal.
    * If you have text selected, it will analyze that text.

2.  **Context Menu (Right-Click):**
    * **On selected text:** Send to AI, Summarize, Explain, or Translate.
    * **On an image:** Analyze the image with AI.
    * **Anywhere on a page:** Summarize the whole page.

3.  **Inside the AI Modal:**
    * **Upload Image:** Click the `+` icon to upload from disk.
    * **Drag & Drop:** Drop any image file onto the modal.
    * **Take Screenshot:** Click the crop icon to snip part of your screen.
    * **Paste Image:** Paste an image directly into the text box.
    * **Process Text:** After OCR, click "Process with AI".
    * **Regenerate:** Click the refresh icon on any assistant reply.
    * **New Chat:** Click the `+` icon in the header.

<details>
<summary><b>Click to expand: Project Architecture & Data Flow</b></summary>
<br />

* **`manifest.json`**: The blueprint. Defines permissions, keyboard shortcut, and background worker.
* **`background.js` (Service Worker)**: Central hub. Handles events, API calls (Google AI, OCR.space), and script injection. Includes retry/timeout logic.
* **`content.js`**: The UI. Injects the draggable modal into the active page.
* **`content.css`**: All modal styles (with dark-mode support).
* **`snipper.js`**: Temporary overlay used to select a screen region for OCR.
* **`options.html` / `options.js`**: Settings page with API key testing, model selection, custom prompt, and import/export.

#### API Architecture
1.  **Google AI (Gemini)** — text model default `gemini-2.5-flash`, vision model default `gemini-2.5-pro`. Both configurable.
2.  **OCR.space** — used for screenshot OCR. Language is configurable.

#### Example Data Flow (Screenshot)
1.  User clicks "snip" in `content.js`.
2.  `content.js` → background: `{type: 'initiateScreenshot'}`.
3.  Background injects `snipper.js`.
4.  User draws a box; `snipper.js` → background: `{type: 'captureRegion', ...}`.
5.  Background captures the visible tab, crops via `OffscreenCanvas`, compresses if needed, sends the image to OCR.space.
6.  Background → `content.js`: `{type: 'showOcrResult', text: '...'}`.
7.  User can click "Process with AI" to send the extracted text to Gemini.

</details>

## License

MIT
