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


Note: This is temporary. Chrome might disable it on restart unless developer mode is enabled.
