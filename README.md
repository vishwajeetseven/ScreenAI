<p align="center">
  <img src="icon.png" width="128" alt="ScreenAI Logo">
  <h1 align="center">ScreenAI</h1>
</p>

<p align="center">
  Your "Bring-Your-Own-Key" multi-provider AI assistant for Google Chrome.
  <br />
  Right-click images for vision analysis, snip your screen for OCR, and get AI help from the provider of your choice, with no subscription.
  <br />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg">
</p>

---

ScreenAI is a privacy-first Chrome extension that brings AI directly into your browser. Analyze images on the web, extract text from any part of your screen, summarize pages, and chat with the AI of your choice: **OpenAI, Anthropic Claude, Google Gemini, Mistral, Groq, OpenRouter, xAI Grok, DeepSeek, Perplexity, Cohere, or a local Ollama model.**

Because it's a "Bring-Your-Own-Key" (BYOK) tool, you have full control. There are no subscriptions, no middleman server, and no third-party data logging. Requests go straight from your browser to the provider you pick.

## Key Features

* **Multi-Provider:** Switch between 11 AI providers from the Options page. Each provider remembers its own API key, text model, and vision model.
* **Context-Aware AI:** Press **`Ctrl+Shift+X`** (**`Cmd+Shift+X`** on Mac) to analyze selected text, or right-click any text/image to send it to the AI.
* **Quick Actions:** Right-click selected text for "Summarize", "Explain", or "Translate". Right-click anywhere for "Summarize this page".
* **Screenshot OCR:** Snip any part of your screen, extract the text with OCR.space, then process that text with the AI.
* **Image Analysis:** Right-click any image to ask questions about it, powered by a configurable vision model.
* **Paste & Upload:** Paste an image directly into the chat, drag-and-drop an image onto the modal, or upload one from your computer.
* **Vision-Aware UI:** If the active provider has no vision support (DeepSeek, Perplexity, Cohere), the image upload and screenshot buttons are hidden automatically.
* **Local Models:** Use Ollama (`http://localhost:11434`) for fully offline AI, no API key required.
* **Regenerate & Copy:** Regenerate any assistant reply, and copy a whole response or an individual code block with one click.
* **Markdown Rendering:** Responses render headings, lists, inline formatting, and code blocks.
* **New Chat:** Start a fresh conversation anytime with the `+` button.
* **Custom System Prompt:** Give the AI a persona or rules from the Options page.
* **Custom Title:** Set your own name for the modal header and the toolbar tooltip, or leave it blank for no title.
* **Reliable Requests:** Automatic retry with exponential backoff on timeouts, rate limits (429), and server errors (5xx).
* **Dark Mode:** Automatically respects your OS `prefers-color-scheme`.
* **Export / Import Settings:** Back up and restore your config with a single click.
* **Privacy-First:** All API calls use your *own* keys, stored locally in `chrome.storage.local`.

## Screenshot

<img width="422" height="529" alt="Screenshot 2026-10-08 at 11 18 22 PM" src="https://github.com/user-attachments/assets/01aaeae2-30b4-4a66-a3ac-5fd89bd401e3" />

## Supported Providers

| Provider | Vision | Notes |
|---|:---:|---|
| OpenAI | ✅ | GPT-5, GPT-5.5, GPT-4.1, GPT-4o |
| Anthropic Claude | ✅ | Claude Sonnet 4.5, 3.7, 3.5 Sonnet/Haiku |
| Google Gemini | ✅ | Gemini 3 / 3.1 previews, Gemini 2.5 stable (default provider) |
| Mistral AI | ✅ | Large, Medium, Small |
| Groq | ✅ | Llama, Mixtral, Gemma (fast inference) |
| OpenRouter | ✅ | One key for 200+ models |
| xAI Grok | ✅ | Grok 4.x |
| DeepSeek | ❌ | V4 Flash / Pro (text only) |
| Perplexity | ❌ | Sonar models with web search (text only) |
| Cohere | ❌ | Command A+, Command A, Command R (text only) |
| Ollama (Local) | ✅ | Llama, Mistral, Qwen, DeepSeek R1; LLaVA / Llama 3.2 Vision for images. No key needed |

> Model lists are defined in `providers.js` and are easy to extend.

## Installation & Setup

This extension is not on the Chrome Web Store. To install it, load it in Developer Mode.

### 1. Load the Extension
1.  Download this repository as a ZIP file and unzip it.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer Mode** (top-right toggle).
4.  Click **Load unpacked**.
5.  Select the unzipped folder (the one containing `manifest.json`).

### 2. Configure a Provider
1.  Click the **ScreenAI icon** in your Chrome toolbar to open Settings.
2.  Choose your **Active AI Provider** from the dropdown.
3.  Paste that provider's **API key** (a "Get a key" link is shown under each field). Ollama needs no key.
4.  Pick your **Text Model** and **Vision Model**.
5.  *(Optional)* Set a **custom title**, **system prompt**, and paste an **OCR.space API key** (free at [ocr.space](https://ocr.space/ocrapi)) with your preferred **OCR language** to enable screenshot OCR.
6.  Use the **Test** buttons to verify each key works.
7.  Click **Save Settings**.

> **Using Ollama?** Make sure Ollama is running locally. If requests are blocked, start it with `OLLAMA_ORIGINS=chrome-extension://*` so the extension is allowed to connect.

## How to Use

1.  **Keyboard Shortcut:**
    * Press **`Ctrl + Shift + X`** (**`Cmd + Shift + X`** on Mac) to open the AI modal.
    * If you have text selected, it is sent to the AI right away. Otherwise an empty chat opens.
    * You can change the shortcut at `chrome://extensions/shortcuts`.

2.  **Context Menu (Right-Click):**
    * **On selected text:** Send to AI, Summarize, Explain, or Translate (to English, or to Spanish if the text is already English).
    * **On an image:** Analyze the image with AI.
    * **Anywhere on a page:** Summarize the page (uses the first ~12,000 characters of visible text).

3.  **Inside the AI Modal:**
    * **Upload Image:** Click the attach icon to upload from disk.
    * **Drag & Drop:** Drop any image file onto the modal.
    * **Take Screenshot:** Click the crop icon to snip part of your screen. Press `Esc` to cancel.
    * **Paste Image:** Paste an image directly into the text box.
    * **Extract Text (OCR):** Use the text-extract button, then click "Process with AI" on the result.
    * **Copy:** Copy a full response or a single code block.
    * **Regenerate:** Click the refresh icon on any assistant reply.
    * **New Chat:** Click the `+` icon in the header.

> ScreenAI can't run on restricted pages such as `chrome://` pages or the Chrome Web Store.

## Privacy & Permissions

* **API keys** are stored only in your browser via `chrome.storage.local` and sent only to the provider you selected.
* **Host permissions** are limited to the provider APIs listed in `manifest.json`, OCR.space, a Google image proxy (used to fetch remote images for vision analysis), and `localhost:11434` for Ollama.
* **`activeTab` / `scripting`** are used to inject the chat modal and the screenshot snipper into the current page.
* **`contextMenus`** adds the right-click actions, and **`storage`** saves your settings.
* Anthropic requests use the `anthropic-dangerous-direct-browser-access` header, which is required for direct browser calls. Only use keys you're comfortable storing locally.

<details>
<summary><b>Click to expand: Project Architecture & Data Flow</b></summary>
<br />

* **`manifest.json`**: The blueprint (Manifest V3). Defines permissions, host permissions, keyboard shortcut, and background worker.
* **`providers.js`**: The provider registry, shared by the service worker and the Options page. Each provider declares its endpoint, auth style (`bearer`, `x-api-key`, `query-key`, `none`), request format (`openai`, `anthropic`, `google`, `cohere`), vision support, and model lists.
* **`background.js` (Service Worker)**: Central hub. Handles events, builds provider-specific requests and parses responses, calls OCR.space, crops screenshots, and injects scripts. Includes retry/timeout logic and duplicate-request protection.
* **`content.js`**: The UI. Injects the draggable modal, renders Markdown, and manages attachments and chat history. Asks the background for provider capabilities to show or hide vision controls.
* **`content.css`**: All modal styles (with dark-mode support).
* **`snipper.js`**: Temporary overlay used to select a screen region for OCR (mouse and touch).
* **`options.html` / `options.js`**: Settings page with provider selection, per-provider keys and models, key testing, custom title and prompt, OCR settings, and import/export.

#### API Architecture
1.  **AI providers**: Selected via `activeProvider`. The default provider is Gemini (`gemini-2.5-pro`). Each provider has its own saved key (`<id>_apiKey`), text model (`<id>_textModel`), and vision model (`<id>_visionModel`).
2.  **OCR.space**: Used for screenshot OCR. The language is configurable.
3.  **Image fetching**: Remote images are fetched through Google's image proxy and converted to base64 before being sent to a vision model. Pasted, uploaded, and screenshot images are already base64.

#### Example Data Flow (Text)
1.  User selects text and picks "Summarize with AI" (or presses the shortcut).
2.  `background.js` injects `content.js` / `content.css` if needed and tells the page to show a loading state.
3.  Background reads the active provider's settings, builds the request in that provider's format, and sends it with retry/timeout handling.
4.  Background parses the response and sends it to `content.js` (`showResponse`), which renders it in the modal.
5.  Follow-up questions send the full chat history back through the same path.

#### Example Data Flow (Screenshot)
1.  User clicks the snip button in `content.js`.
2.  `content.js` → background: `{type: 'initiateScreenshot'}`.
3.  Background injects `snipper.js`.
4.  User draws a box; `snipper.js` → background: `{type: 'captureRegion', ...}`.
5.  Background captures the visible tab, crops via `OffscreenCanvas`, and compresses to JPEG (under ~1 MB) if needed.
6.  Background → `content.js`: `{type: 'screenshotReady', ...}`. The image is staged in the modal.
7.  The user either asks the vision model about it, or runs OCR: `content.js` → background: `{type: 'doOcr'}`, which sends the image to OCR.space and returns `{type: 'showOcrResult', text: '...'}`.
8.  User can click "Process with AI" to send the extracted text to the active provider.

</details>

## License

MIT
