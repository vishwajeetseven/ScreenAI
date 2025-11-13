// content.js (Updated with new SVG Snip Icon)

(() => {
  // --- GUARD 1: Prevent multiple injections on the same page ---
  if (window.hasScreenAIModal) {
    return;
  }
  window.hasScreenAIModal = true;
  // --- END GUARD 1 ---

  // --- Store chat history ---
  let chatHistory = [];
  let loadingInterval = null; // For "Loading..." animation

  // --- SVG Icons ---
  const copyIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-5zm0 16H8V7h11v14z"></path>
    </svg>`;
  
  const checkIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
    </svg>`;

  const attachIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
    </svg>`;
  
  // --- NEW: Modern Snipping SVG Icon (Crop) ---
  const snipIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"></path>
    </svg>`;


  // --- Helper: Convert clipboard blob to Base64 ---
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // result is "data:mime/type;base64,ENCODED_STRING"
        // We just want the "ENCODED_STRING" part
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // --- Helper to escape HTML for <pre> tag ---
  function escapeHTML(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // --- Loading Animation Functions ---
  function startLoadingAnimation(loadingEl) {
    if (!loadingEl) return;
    stopLoadingAnimation(); // Stop any existing one
    
    let dotCount = 0;
    loadingEl.textContent = 'Loading'; // Set initial text

    loadingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3
      let dots = '';
      if (dotCount === 1) dots = ' .';
      else if (dotCount === 2) dots = ' ..';
      else if (dotCount === 3) dots = ' ...';
      
      // Check if element still exists before updating
      if (document.getElementById(loadingEl.id)) {
          loadingEl.textContent = 'Loading' + dots;
      } else {
          stopLoadingAnimation(); // Element was removed, stop interval
      }
    }, 500); // Animation speed
  }

  function stopLoadingAnimation() {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }

  // --- Listen for messages from the background script ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // --- GUARD 2: Prevent "zombie" scripts after extension reload ---
    if (!chrome.runtime.id) {
      return;
    }
    // --- END GUARD 2 ---
    
    
    // --- NEW: Re-show modal if snip was cancelled ---
    if (message.type === 'showModal') {
        const modal = document.getElementById('screenai-ai-modal');
        if (modal) modal.style.display = 'flex';
    }
    // --- NEW: Handle screenshot data ---
    else if (message.type === 'screenshotReady') {
        const modal = document.getElementById('screenai-ai-modal');
        if (modal) modal.style.display = 'flex';
        
        const loadingEl = appendMessage('Extracting text...', 'system', true, 'screenai-loading-message');
        startLoadingAnimation(loadingEl);
        chrome.runtime.sendMessage({ type: 'doOcr', imageData: message.base64Data });
    }
    else if (message.type === 'showLoading') {
      // This is for a NEW query
      createOrShowModal("Loading...", false, true); // (content, isError, isNewChat)
    } 
    else if (message.type === 'showResponse') {
      // This is the FIRST response to a NEW query
      stopLoadingAnimation(); // Stop the animation
      chatHistory = []; // Clear history
      chatHistory.push({ role: 'user', content: message.prompt });
      chatHistory.push({ role: 'assistant', content: message.response });
      updateChatDisplay(true); // This redraws everything, removing the loading element
      
      const inputEl = document.getElementById('screenai-ai-input');
      if (inputEl) inputEl.placeholder = "Ask a follow-up...";
    } 
    else if (message.type === 'showFollowUpResponse') {
      // This is a response to a follow-up
      stopLoadingAnimation();
      const loadingEl = document.getElementById('screenai-loading-message');
      if (loadingEl) loadingEl.remove(); 
      
      chatHistory.push(message.response); 
      appendMessage(message.response.content, 'assistant', true);
      
      const inputEl = document.getElementById('screenai-ai-input');
      if (inputEl) inputEl.placeholder = "Ask a follow-up...";
    }
    else if (message.type === 'showEmptyModal') {
      // This is for opening the modal without a prompt
      createOrShowModal("", false, true); // (content, isError, isNewChat)
    }
    else if (message.type === 'showError' || message.type === 'showOcrError') {
       // --- MODIFIED: Ensure modal is visible on error ---
       const modal = document.getElementById('screenai-ai-modal');
       if (modal) modal.style.display = 'flex';
       
       stopLoadingAnimation();
       const loadingEl = document.getElementById('screenai-loading-message');
       if (loadingEl) {
           loadingEl.remove();
           appendMessage(message.data, 'error', true);
       } else {
           createOrShowModal(message.data, true, true);
       }
    }
    else if (message.type === 'showOcrResult') {
        stopLoadingAnimation();
        const loadingEl = document.getElementById('screenai-loading-message');
        if (loadingEl) loadingEl.remove();
        
        appendMessage(message.text, 'ocr-result', true);
    }
  });
  
  /**
   * --- Robust Markdown to HTML Renderer ---
   */

  function processInlineMarkdown(text) {
      text = text.replace(/`(.+?)`/g, '<code>$1</code>');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      return text;
  }

  function simpleMarkdownToHTML(text) {
      let html = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      let lines = html.split('\n');
      let inCodeBlock = false;
      let inList = false;
      let listType = 'ul'; 
      let processedHTML = '';

      for (let i = 0; i < lines.length; i++) {
          let line = lines[i];

          if (line.startsWith('```')) {
              if (inList) {
                  processedHTML += `</${listType}>\n`;
                  inList = false;
              }
              if (inCodeBlock) {
                  processedHTML += '</code></div></pre>\n'; 
                  inCodeBlock = false;
              } else {
                  const lang = line.substring(3).trim();
                  const langClass = lang ? ` class="language-${lang}"` : '';
                  processedHTML += `<pre><button class="screenai-copy-code-btn" title="Copy code">${copyIconSVG}</button><div class="screenai-code-wrapper"><code${langClass}>`;
                  inCodeBlock = true;
              }
              continue;
          }

          if (inCodeBlock) {
              processedHTML += line + '\n';
              continue;
          }
          
          if (inList && !line.match(/^(\s*\*|\s*-|\s*[0-9]+\.|\s*- \[.\])\s/)) {
               processedHTML += `</${listType}>\n`;
               inList = false;
          }

          if (line.startsWith('### ')) {
              processedHTML += `<h3>${processInlineMarkdown(line.substring(4))}</h3>\n`;
              continue;
          }
          if (line.startsWith('## ')) {
              processedHTML += `<h2>${processInlineMarkdown(line.substring(3))}</h2>\n`;
              continue;
          }
          if (line.startsWith('# ')) {
              processedHTML += `<h1>${processInlineMarkdown(line.substring(2))}</h1>\n`;
              continue;
          }

          if (line.trim() === '---') {
              processedHTML += '<hr>\n';
              continue;
          }

          let listItem = null;
          let trimLine = line.trim();

          if (trimLine.startsWith('- [ ] ')) {
              listItem = processInlineMarkdown(trimLine.substring(6));
              if (!inList) { listType = 'ul'; processedHTML += '<ul class="checklist">\n'; inList = true; }
              processedHTML += `<li><input type="checkbox" disabled> ${listItem}</li>\n`;
              continue;
          }
          if (trimLine.startsWith('- [x] ')) {
              listItem = processInlineMarkdown(trimLine.substring(6));
              if (!inList) { listType = 'ul'; processedHTML += '<ul class="checklist">\n'; inList = true; }
              processedHTML += `<li><input type="checkbox" disabled checked> ${listItem}</li>\n`;
              continue;
          }
          if (trimLine.startsWith('* ')) {
              listItem = processInlineMarkdown(trimLine.substring(2));
              if (!inList) { listType = 'ul'; processedHTML += '<ul>\n'; inList = true; }
              processedHTML += `<li>${listItem}</li>\n`;
              continue;
          }
          if (trimLine.startsWith('- ')) {
              listItem = processInlineMarkdown(trimLine.substring(2));
              if (!inList) { listType = 'ul'; processedHTML += '<ul>\n'; inList = true; }
              processedHTML += `<li>${listItem}</li>\n`;
              continue;
          }
          const orderedMatch = trimLine.match(/^(\d+)\.\s+(.*)/);
          if (orderedMatch) {
              listItem = processInlineMarkdown(orderedMatch[2]);
              if (!inList) { listType = 'ol'; processedHTML += '<ol>\n'; inList = true; }
              processedHTML += `<li>${listItem}</li>\n`;
              continue;
          }


          if (line.trim() === '') {
          } else {
              processedHTML += `<p>${processInlineMarkdown(line)}</p>\n`;
          }
      }

      if (inCodeBlock) processedHTML += '</code></div></pre>';
      if (inList) processedHTML += `</${listType}>\n`;

      return processedHTML;
  }


  /**
   * --- Appends a new message and returns the new element ---
   */
  function appendMessage(text, role, shouldScroll = true, id = null) {
    const contentEl = document.getElementById('screenai-ai-content');
    if (!contentEl) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'screenai-message ' + role;
    if (id) {
      msgDiv.id = id;
    }
    
    if (role === 'assistant') {
      msgDiv.innerHTML = simpleMarkdownToHTML(text); 
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'screenai-copy-response-btn';
      copyBtn.title = 'Copy entire response';
      copyBtn.innerHTML = copyIconSVG; 
      msgDiv.appendChild(copyBtn);
      
    } else if (role === 'ocr-result') {
        msgDiv.innerHTML = `
          <div class="screenai-ocr-header">
            <span>Extracted Text</span>
            <button class="screenai-copy-ocr-btn" title="Copy text">${copyIconSVG}</button>
          </div>
          <pre class="screenai-ocr-text">${escapeHTML(text)}</pre>
          <button class="screenai-process-ocr-btn" title="Process with AI">
            <span class="screenai-sparkle-icon">✨</span>
            <span>Process with AI</span>
          </button>
        `;
    
    } else {
      msgDiv.textContent = text; // User/System/Error
    }
    
    contentEl.appendChild(msgDiv);
    
    if (shouldScroll) {
      contentEl.scrollTop = contentEl.scrollHeight;
    }
    
    return msgDiv; 
  }

  /**
   * Clears the chat and redraws it from chatHistory
   */
  function updateChatDisplay(scrollToBottom = false) {
    const contentEl = document.getElementById('screenai-ai-content');
    if (!contentEl) return;
    
    contentEl.innerHTML = ''; // Clear display
    chatHistory.forEach((msg, index) => {
      const shouldScroll = (index === chatHistory.length - 1) && scrollToBottom;
      appendMessage(msg.content, msg.role, shouldScroll);
    });
  }
  
  /**
   * Handles sending a follow-up question
   */
  function handleFollowUp() {
    const input = document.getElementById('screenai-ai-input');
    if (!input) return;
    
    const newQuestion = input.value.trim();
    if (!newQuestion) return;

    chatHistory.push({ role: 'user', content: newQuestion });
    appendMessage(newQuestion, 'user', true); 
    
    const loadingEl = appendMessage('Loading', 'system', true, 'screenai-loading-message'); 
    startLoadingAnimation(loadingEl); 
    
    input.value = '';
    
    chrome.runtime.sendMessage({ type: 'askFollowUp', history: chatHistory });
  }

  /**
   * --- NEW: Handles sending extracted OCR text to AI ---
   */
  function handleOcrProcess(text) {
    if (!text) return;
    
    chatHistory.push({ role: 'user', content: text });
    appendMessage(text, 'user', true);
    
    const loadingEl = appendMessage('Loading', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);
    
    chrome.runtime.sendMessage({ type: 'askFollowUp', history: chatHistory });
  }
  
  /**
   * --- NEW: Unified function to start OCR process from a blob ---
   */
  async function startOcrProcess(imageBlob) {
    if (!imageBlob || !imageBlob.type.startsWith('image/')) {
      appendMessage('Error: The provided file is not a valid image.', 'error', true);
      return;
    }

    const loadingEl = appendMessage('Extracting text...', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);

    try {
      const base64Data = await blobToBase64(imageBlob);
      chrome.runtime.sendMessage({ type: 'doOcr', imageData: base64Data });
    } catch (error) {
      stopLoadingAnimation();
      if (loadingEl) loadingEl.remove();
      appendMessage(`Error: ${error.message || 'Could not process image.'}`, 'error', true);
    }
  }

  /**
   * --- NEW: Handles file upload from the hidden file input ---
   */
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      startOcrProcess(file);
    }
    // Reset input to allow re-uploading the same file
    event.target.value = null;
  }
  
  /**
   * --- NEW: Handles pasting an image into the text input ---
   */
  function handleTextInputPaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let imageBlob = null;

    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        imageBlob = item.getAsFile();
        break;
      }
    }

    if (imageBlob) {
      event.preventDefault(); // Stop text paste
      startOcrProcess(imageBlob);
    }
    // If no imageBlob, do nothing and let the default text paste occur.
  }
  
  // --- NEW: Handle Snipping ---
  function handleSnip() {
    const modal = document.getElementById('screenai-ai-modal');
    if (modal) modal.style.display = 'none'; // Hide modal
    chrome.runtime.sendMessage({ type: 'initiateScreenshot' });
  }


  // --- Core Modal Function ---
  function createOrShowModal(content, isError = false, isNewChat = false) {
    let modal = document.getElementById('screenai-ai-modal');
    
    if (!modal) {
      // --- Create the modal ---
      modal = document.createElement('div');
      modal.id = 'screenai-ai-modal';

      // --- MODIFIED: Inject CSS (with new SVG icon styles) ---
      const style = document.createElement('style');
      style.textContent = `
        #screenai-ai-modal {
          position: fixed;
          width: 400px;
          z-index: 2147483647;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 14px;
          color: #222;
          display: flex;
          flex-direction: column;
          transition: height 0.2s ease-out, opacity 0.2s ease-out;
        }
        #screenai-ai-modal.minimized {
          height: 38px !important;
          min-height: 38px !important;
          overflow: hidden;
        }
        #screenai-ai-modal.minimized #screenai-ai-content,
        #screenai-ai-modal.minimized #screenai-ai-footer {
          display: none;
        }
        #screenai-ai-header {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          user-select: none;
          cursor: move;
        }
        #screenai-ai-header > span {
          font-weight: 600;
          color: #333;
        }
        #screenai-ai-controls {
          margin-left: 0;
          margin-right: auto;
          padding-right: 10px;
        }
        #screenai-ai-controls button {
          background: none;
          border: none;
          cursor: pointer;
          font-weight: bold;
          font-size: 16px;
          padding: 0 4px;
          color: #888;
        }
        #screenai-minimize-btn {
          color: #E6A23C;
          font-weight: 900;
          font-size: 20px;
          line-height: 16px;
        }
        #screenai-close-btn {
          color: #F56C6C;
          font-weight: 900;
          font-size: 20px;
          line-height: 16px;
        }
        #screenai-ai-controls button:hover { color: #000; }
        #screenai-minimize-btn:hover { color: #B88230; }
        #screenai-close-btn:hover { color: #C45656; }
        
        #screenai-ai-content {
          max-height: 400px; 
          padding: 10px 15px;
          overflow-y: auto;
          white-space: normal;
          word-wrap: break-word;
          line-height: 1.6;
          scroll-behavior: smooth;
        }
        #screenai-ai-content:empty { padding: 0; }
        
        #screenai-ai-content pre { position: relative; }

        .screenai-message {
          padding: 0;
          border-radius: 10px;
          margin-bottom: 8px;
          max-width: 90%;
          text-align: left;
        }
        .screenai-message.user {
          background-color: #007aff;
          color: white;
          margin-left: auto;
          text-align: right;
          padding: 8px 12px;
        }
        .screenai-message.assistant {
          background-color: #e5e5ea;
          color: #000;
          margin-right: auto;
          padding: 1px 12px 1px 1px;
          position: relative;
        }
        .screenai-message.system, .screenai-message.error {
          background-color: #f0f0f0;
          color: #555;
          text-align: center;
          font-style: italic;
          font-size: 12px;
          max-width: 100%;
          padding: 8px 12px;
        }
        .screenai-message.error {
          color: #D8000C;
          background-color: #FFBABA;
          font-style: normal;
        }
        
        /* --- OCR Result Bubble Styles --- */
        .screenai-message.ocr-result {
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          color: #000;
          margin-right: auto;
          max-width: 100%;
          padding: 0;
          overflow: hidden;
        }
        .screenai-ocr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #efefef;
          padding: 4px 10px;
          border-bottom: 1px solid #ddd;
        }
        .screenai-ocr-header > span {
          font-size: 12px;
          font-weight: 600;
          color: #333;
        }
        .screenai-copy-ocr-btn {
          background: none; border: none; cursor: pointer;
          color: #555; opacity: 0.7; padding: 2px;
          display: flex; align-items: center; justify-content: center;
        }
        .screenai-copy-ocr-btn:hover { opacity: 1; color: #000; }
        .screenai-copy-ocr-btn svg { width: 14px; height: 14px; }
        
        .screenai-ocr-text {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          color: #111;
          white-space: pre-wrap;
          word-wrap: break-word;
          padding: 10px;
          margin: 0;
          max-height: 150px;
          overflow-y: auto;
          background: #fff;
          border: none;
        }
        .screenai-process-ocr-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          border: none;
          border-top: 1px solid #ddd;
          background: #f0f8ff;
          color: #0056b3;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .screenai-process-ocr-btn:hover { background: #e0f0ff; }
        .screenai-sparkle-icon {
          font-size: 14px;
          line-height: 1;
        }
        /* --- END OCR STYLES --- */
        
        
        /* --- MARKDOWN STYLES --- */
        .screenai-message p { margin: 10px 0 10px 11px; }
        .screenai-message p:first-child { margin-top: 10px; }
        .screenai-message p:last-child { margin-bottom: 10px; }
        .screenai-message h1, .screenai-message h2, .screenai-message h3 {
          margin: 15px 0 10px 11px;
          font-weight: 600;
        }
        .screenai-message h1 { font-size: 1.3em; }
        .screenai-message h2 { font-size: 1.2em; }
        .screenai-message h3 { font-size: 1.1em; }
        .screenai-message hr {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin: 1em 0;
        }
        .screenai-message ul, .screenai-message ol {
          margin: 10px 0 10px 30px;
          padding: 0;
        }
        .screenai-message li { margin-bottom: 4px; }
        .screenai-message ul.checklist {
          list-style-type: none;
          margin-left: 11px;
        }
        .screenai-message ul.checklist li {
          display: flex;
          align-items: center;
        }
        .screenai-message ul.checklist input[type="checkbox"] {
          margin-right: 8px;
          vertical-align: middle;
        }
        .screenai-message em { font-style: italic; }
        .screenai-message.assistant pre {
          background-color: #1e1e1e;
          border-radius: 6px;
          margin: 12px 0 12px 11px;
          padding: 0;
          border: none !important;
        }
        .screenai-code-wrapper {
          overflow-x: auto;
          padding: 10px;
          padding-top: 30px;
        }
        .screenai-message.assistant code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
        }
        .screenai-message.assistant pre code {
          white-space: pre;
          color: #d4d4d4;
          background-color: transparent !important; 
          padding: 0;
          border-radius: 0;
          border: none !important;
        }
        .screenai-message.assistant p > code, 
        .screenai-message.assistant li > code, 
        .screenai-message.assistant h3 > code {
          background-color: rgba(0,0,0,0.08);
          color: #111;
          padding: 2px 5px;
          border-radius: 4px;
          white-space: normal; 
          font-weight: normal; 
          word-wrap: break-word;
        }
        /* --- END MARKDOWN STYLES --- */
        
        /* --- COPY BUTTON STYLES --- */
        .screenai-copy-code-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          z-index: 1;
          background-color: #333;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s, background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .screenai-copy-code-btn:hover {
          opacity: 1;
          background-color: #111;
        }
        .screenai-copy-response-btn {
          position: absolute;
          top: 5px;
          right: -28px;
          z-index: 1;
          background: none;
          border: none;
          color: #555;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s, color 0.2s;
          padding: 4px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .screenai-copy-response-btn:hover {
          opacity: 1;
          color: #000;
        }
        .screenai-copy-code-btn svg,
        .screenai-copy-response-btn svg {
          width: 16px;
          height: 16px;
        }
        .screenai-copy-btn-copied {
          color: #007aff !important;
          opacity: 1 !important;
        }
        .screenai-copy-code-btn.screenai-copy-btn-copied {
           background-color: #333 !important;
        }
        .screenai-copy-ocr-btn.screenai-copy-btn-copied {
           color: #007aff !important;
        }
        /* --- END COPY BUTTON STYLES --- */

        /* Footer Styles */
        #screenai-ai-footer {
          padding: 8px 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          background-color: rgba(245, 245, 245, 0.7);
        }
        
        /* --- Style for base icon buttons (attach, snip) --- */
        .screenai-footer-btn {
          background: none;
          border: none;
          border-radius: 5px;
          padding: 4px;
          margin-right: 4px;
          cursor: pointer;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .screenai-footer-btn:hover {
          background-color: rgba(0,0,0,0.05);
          color: #000;
        }
        #screenai-attach-btn svg {
          width: 20px;
          height: 20px;
        }
        
        /* --- MODIFIED: Style for Snip Button SVG --- */
        #screenai-snip-btn svg {
          width: 18px; 
          height: 18px;
        }
        
        #screenai-ai-footer span {
          margin: 0 4px 0 4px;
          font-size: 14px;
          color: #555;
        }
        #screenai-ai-input {
          flex-grow: 1;
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          padding: 6px 0;
        }
        #screenai-send-btn {
          background: #007aff;
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 16px;
          cursor: pointer;
          margin-left: 8px;
          padding: 0;
          line-height: 28px;
        }
        #screenai-send-btn:hover {
          background: #0056b3;
        }
      `;
      document.head.appendChild(style);

      // --- Set Modal HTML (with new SVG snip icon) ---
      modal.innerHTML = `
        <div id="screenai-ai-header">
          <div id="screenai-ai-controls">
            <button id="screenai-minimize-btn" title="Minimize/Maximize">-</button>
            <button id="screenai-close-btn" title="Close">×</button>
          </div>
          <span>ScreenAI</span>
        </div>
        <div id="screenai-ai-content"></div>
        <div id="screenai-ai-footer">
          <button id="screenai-attach-btn" class="screenai-footer-btn" title="Upload Image">${attachIconSVG}</button>
          <button id="screenai-snip-btn" class="screenai-footer-btn" title="Take Screenshot">${snipIconSVG}</button>
          <span>></span>
          <input type="text" id="screenai-ai-input" placeholder="Ask, paste image, or click to upload..." />
          <button id="screenai-send-btn" title="Send">➤</button>
        </div>
        <input type="file" id="screenai-file-input" style="display: none;" accept="image/*" />
      `;
      
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      
      document.body.appendChild(modal);

      // --- Add Event Listeners ---
      document.getElementById('screenai-close-btn').onclick = () => {
        modal.style.opacity = '0';
        setTimeout(() => {
          modal.remove();
          window.hasScreenAIModal = false; 
        }, 200);
      };
      
      document.getElementById('screenai-minimize-btn').onclick = () => {
        modal.classList.toggle('minimized');
      };
      
      document.getElementById('screenai-send-btn').onclick = handleFollowUp;
      document.getElementById('screenai-ai-input').onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleFollowUp();
        }
      };
      
      // --- Upload/Paste/Snip Listeners ---
      document.getElementById('screenai-attach-btn').onclick = () => {
        document.getElementById('screenai-file-input').click();
      };
      document.getElementById('screenai-snip-btn').onclick = handleSnip; // NEW
      document.getElementById('screenai-file-input').onchange = handleFileUpload;
      document.getElementById('screenai-ai-input').onpaste = handleTextInputPaste;
      
      
      // --- Event Delegation for Copy/Process ---
      const contentEl = document.getElementById('screenai-ai-content');
      contentEl.addEventListener('click', (e) => {
        const target = e.target.closest('button'); 
        if (!target) return;

        // 1. Copy Code
        if (target.classList.contains('screenai-copy-code-btn')) {
          const pre = target.closest('pre');
          const code = pre.querySelector('code');
          if (code) {
            navigator.clipboard.writeText(code.textContent);
            target.innerHTML = checkIconSVG;
            target.classList.add('screenai-copy-btn-copied');
            setTimeout(() => { 
              target.innerHTML = copyIconSVG;
              target.classList.remove('screenai-copy-btn-copied');
            }, 2000);
          }
        }

        // 2. Copy Response
        if (target.classList.contains('screenai-copy-response-btn')) {
          const msgDiv = target.closest('.screenai-message');
          const clone = msgDiv.cloneNode(true);
          clone.querySelectorAll('button').forEach(btn => btn.remove());
          const textToCopy = clone.textContent;
          
          navigator.clipboard.writeText(textToCopy);
          target.innerHTML = checkIconSVG;
          target.classList.add('screenai-copy-btn-copied');
          setTimeout(() => { 
            target.innerHTML = copyIconSVG;
            target.classList.remove('screenai-copy-btn-copied');
          }, 2000);
        }
        
        // 3. Copy OCR Text
        if (target.classList.contains('screenai-copy-ocr-btn')) {
            const pre = target.closest('.screenai-message').querySelector('.screenai-ocr-text');
            if (pre) {
                navigator.clipboard.writeText(pre.textContent);
                target.innerHTML = checkIconSVG;
                target.classList.add('screenai-copy-btn-copied');
                setTimeout(() => {
                    target.innerHTML = copyIconSVG;
                    target.classList.remove('screenai-copy-btn-copied');
                }, 2000);
            }
        }
        
        // 4. Process OCR Text
        if (target.classList.contains('screenai-process-ocr-btn')) {
            const pre = target.closest('.screenai-message').querySelector('.screenai-ocr-text');
            if (pre) {
                handleOcrProcess(pre.textContent);
            }
        }
      });
      // --- END: EVENT DELEGATION ---


      // --- Drag-and-Drop Logic ---
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      const header = document.getElementById('screenai-ai-header');
      
      header.onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (modal.style.transform) {
          const rect = modal.getBoundingClientRect();
          modal.style.top = rect.top + 'px';
          modal.style.left = rect.left + 'px';
          modal.style.transform = '';
        }
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        modal.style.top = (modal.offsetTop - pos2) + "px";
        modal.style.left = (modal.offsetLeft - pos1) + "px";
      }

      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
      // --- END: Drag-and-Drop Logic ---

    } // end if !modal

    // --- Update Modal Content ---
    if (isNewChat) {
      const contentEl = document.getElementById('screenai-ai-content');
      contentEl.innerHTML = ''; 
      chatHistory = []; 
      if (isError) {
        appendMessage(content, 'error', true);
      } else if (content) {
        const msgContent = (content === 'Loading...') ? 'Loading' : content;
        const loadingEl = appendMessage(msgContent, 'system', true, 'screenai-loading-message');
        if (content === 'Loading...') {
           startLoadingAnimation(loadingEl);
        }
      }
    } else if (isError) {
      appendMessage(content, 'error', true);
    }
    
    // --- Reset placeholder if it's a new chat ---
    const inputEl = document.getElementById('screenai-ai-input');
    if (isNewChat && inputEl) {
      inputEl.placeholder = "Ask, paste image, or click to upload...";
    }
    
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    if (modal.classList.contains('minimized')) {
      modal.classList.remove('minimized');
    }

  } // end createOrShowModal()
})();