// content.js (v4.2) — Pending attachments, separate OCR button, reordered controls
(() => {
  if (window.hasScreenAIModal) return;
  window.hasScreenAIModal = true;

  let chatHistory = [];
  let loadingInterval = null;
  let isProcessingFollowUp = false;
  let pendingImage = null;            // { blob, dataUrl, name }
  let screenshotIntent = 'attach';    // 'attach' | 'ocr'

  // ---------- SVG Icons (SF Symbols style, stroke-based) ----------
  const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
  const attachIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
  const snipIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>`;
  const textExtractIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M9 9.5h6"/><path d="M12 9.5v7"/></svg>`;
  const newChatIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
  const regenerateIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`;
  const sendIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`;
  const sparkleIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.9L19 9.8l-5.1 1.9L12 17l-1.9-5.3L5 9.8l5.1-1.9L12 3z"/><path d="M19 15l.7 1.9L21.6 17.6l-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"/></svg>`;

  // ---------- Clipboard ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, mimeType = 'image/jpeg') {
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    return new Blob([new Uint8Array(byteNums)], { type: mimeType });
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ---------- Loading ----------
  function startLoadingAnimation(loadingEl) {
    if (!loadingEl) return;
    stopLoadingAnimation();
    let dotCount = 0;
    loadingEl.textContent = 'Loading';
    loadingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      const dots = dotCount === 0 ? '' : ' ' + '.'.repeat(dotCount);
      if (document.getElementById(loadingEl.id)) {
        loadingEl.textContent = 'Loading' + dots;
      } else {
        stopLoadingAnimation();
      }
    }, 500);
  }
  function stopLoadingAnimation() {
    if (loadingInterval) { clearInterval(loadingInterval); loadingInterval = null; }
  }

  // ---------- Markdown ----------
  function processInlineMarkdown(text) {
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return text;
  }

  function simpleMarkdownToHTML(text) {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = html.split('\n');

    let inCodeBlock = false;
    let inList = false;
    let listType = 'ul';
    let inBlockquote = false;
    let paragraph = [];
    let out = '';

    function flushParagraph() {
      if (paragraph.length === 0) return;
      const joined = paragraph.join('<br>');
      out += `<p>${processInlineMarkdown(joined)}</p>\n`;
      paragraph = [];
    }
    function closeList() {
      if (inList) { out += `</${listType}>\n`; inList = false; }
    }
    function closeBlockquote() {
      if (inBlockquote) { out += '</blockquote>\n'; inBlockquote = false; }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trim = line.trim();

      if (trim.startsWith('```')) {
        flushParagraph(); closeList(); closeBlockquote();
        if (inCodeBlock) {
          out += '</code></div></pre>\n';
          inCodeBlock = false;
        } else {
          const lang = trim.substring(3).trim();
          const langClass = lang ? ` class="language-${lang}"` : '';
          out += `<pre><button class="screenai-copy-code-btn" title="Copy code">${copyIconSVG}</button><div class="screenai-code-wrapper"><code${langClass}>`;
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) { out += line + '\n'; continue; }

      if (trim.startsWith('&gt; ')) {
        flushParagraph(); closeList();
        if (!inBlockquote) { out += '<blockquote>\n'; inBlockquote = true; }
        out += `<p>${processInlineMarkdown(trim.substring(5))}</p>\n`;
        continue;
      } else if (inBlockquote) {
        closeBlockquote();
      }

      if (trim.startsWith('### ')) { flushParagraph(); closeList(); out += `<h3>${processInlineMarkdown(trim.substring(4))}</h3>\n`; continue; }
      if (trim.startsWith('## ')) { flushParagraph(); closeList(); out += `<h2>${processInlineMarkdown(trim.substring(3))}</h2>\n`; continue; }
      if (trim.startsWith('# ')) { flushParagraph(); closeList(); out += `<h1>${processInlineMarkdown(trim.substring(2))}</h1>\n`; continue; }
      if (trim === '---') { flushParagraph(); closeList(); out += '<hr>\n'; continue; }

      const isChecklist = /^- \[[ xX]\] /.test(trim);
      const isBullet = /^[*-] /.test(trim);
      const isOrdered = /^\d+\.\s+/.test(trim);

      if (!isChecklist && !isBullet && !isOrdered && inList) closeList();

      if (isChecklist) {
        flushParagraph();
        const checked = trim.startsWith('- [x]') || trim.startsWith('- [X]');
        const content = processInlineMarkdown(trim.substring(6));
        if (!inList || listType !== 'ul') { closeList(); out += '<ul class="checklist">\n'; inList = true; listType = 'ul'; }
        out += `<li><input type="checkbox" disabled${checked ? ' checked' : ''}> ${content}</li>\n`;
        continue;
      }
      if (isBullet) {
        flushParagraph();
        const content = processInlineMarkdown(trim.substring(2));
        if (!inList || listType !== 'ul') { closeList(); out += '<ul>\n'; inList = true; listType = 'ul'; }
        out += `<li>${content}</li>\n`;
        continue;
      }
      if (isOrdered) {
        flushParagraph();
        const match = trim.match(/^(\d+)\.\s+(.*)/);
        const content = processInlineMarkdown(match[2]);
        if (!inList || listType !== 'ol') { closeList(); out += '<ol>\n'; inList = true; listType = 'ol'; }
        out += `<li>${content}</li>\n`;
        continue;
      }

      if (trim === '') { flushParagraph(); continue; }
      paragraph.push(trim);
    }

    flushParagraph(); closeList(); closeBlockquote();
    if (inCodeBlock) out += '</code></div></pre>';
    return out;
  }

  // ---------- Render ----------
  function appendMessage(text, role, shouldScroll = true, id = null) {
    const contentEl = document.getElementById('screenai-ai-content');
    if (!contentEl) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'screenai-message ' + role;
    if (id) msgDiv.id = id;

    if (role === 'assistant') {
      msgDiv.innerHTML = simpleMarkdownToHTML(text);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'screenai-copy-response-btn';
      copyBtn.title = 'Copy entire response';
      copyBtn.innerHTML = copyIconSVG;
      msgDiv.appendChild(copyBtn);

      const regenBtn = document.createElement('button');
      regenBtn.className = 'screenai-regenerate-btn';
      regenBtn.title = 'Regenerate';
      regenBtn.innerHTML = regenerateIconSVG;
      msgDiv.appendChild(regenBtn);
    } else if (role === 'ocr-result') {
      msgDiv.innerHTML = `
        <div class="screenai-ocr-header">
          <span>Extracted Text</span>
          <button class="screenai-copy-ocr-btn" title="Copy text">${copyIconSVG}</button>
        </div>
        <pre class="screenai-ocr-text">${escapeHTML(text)}</pre>
        <button class="screenai-process-ocr-btn" title="Process with AI">
          <span class="screenai-sparkle-icon">${sparkleIconSVG}</span>
          <span>Process with AI</span>
        </button>`;
    } else {
      msgDiv.textContent = text;
    }

    contentEl.appendChild(msgDiv);
    if (shouldScroll) contentEl.scrollTop = contentEl.scrollHeight;
    return msgDiv;
  }

  function updateChatDisplay(scrollToBottom = false) {
    const contentEl = document.getElementById('screenai-ai-content');
    if (!contentEl) return;
    contentEl.innerHTML = '';
    chatHistory.forEach((msg, index) => {
      const shouldScroll = (index === chatHistory.length - 1) && scrollToBottom;
      appendMessage(msg.content, msg.role, shouldScroll);
    });
  }

  // ---------- Pending attachment ----------
  function stageImage(blob, name = 'Image') {
    clearPendingImage();
    const dataUrl = URL.createObjectURL(blob);
    pendingImage = { blob, dataUrl, name };
    updateAttachmentPreview();
    const inputEl = document.getElementById('screenai-ai-input');
    if (inputEl) inputEl.focus();
  }

  function clearPendingImage() {
    if (pendingImage && pendingImage.dataUrl) {
      try { URL.revokeObjectURL(pendingImage.dataUrl); } catch (_) {}
    }
    pendingImage = null;
    updateAttachmentPreview();
  }

  function updateAttachmentPreview() {
    const previewEl = document.getElementById('screenai-ai-attachment-preview');
    if (!previewEl) return;
    if (pendingImage) {
      previewEl.style.display = 'flex';
      const thumbEl = document.getElementById('screenai-ai-attachment-thumb');
      const nameEl = document.getElementById('screenai-ai-attachment-name');
      if (thumbEl) thumbEl.src = pendingImage.dataUrl;
      if (nameEl) nameEl.textContent = pendingImage.name;
    } else {
      previewEl.style.display = 'none';
    }
  }

  // ---------- Handlers ----------
  function handleFollowUp() {
    const input = document.getElementById('screenai-ai-input');
    if (!input) return;
    const newQuestion = input.value.trim();
    if (!newQuestion && !pendingImage) return;
    if (isProcessingFollowUp) return;

    isProcessingFollowUp = true;

    const displayText = newQuestion || (pendingImage ? 'Analyze this image' : '');
    chatHistory.push({ role: 'user', content: displayText });
    appendMessage(displayText, 'user', true);

    const loadingEl = appendMessage('Loading', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);

    input.value = '';
    input.style.height = 'auto';

    if (pendingImage) {
      const imgBlob = pendingImage.blob;
      const hadText = !!newQuestion;
      clearPendingImage();

      blobToBase64(imgBlob).then(base64 => {
        chrome.runtime.sendMessage({
          type: 'imageChat',
          prompt: newQuestion,
          imageBase64: base64
        }, () => {
          if (chrome.runtime.lastError) {
            isProcessingFollowUp = false;
            stopLoadingAnimation();
            if (loadingEl) loadingEl.remove();
            appendMessage(`Error: ${chrome.runtime.lastError.message}`, 'error', true);
          }
        });
      }).catch(err => {
        isProcessingFollowUp = false;
        stopLoadingAnimation();
        if (loadingEl) loadingEl.remove();
        appendMessage(`Error: ${err.message}`, 'error', true);
      });
    } else {
      chrome.runtime.sendMessage({ type: 'askFollowUp', history: chatHistory }, () => {
        if (chrome.runtime.lastError) isProcessingFollowUp = false;
      });
    }
  }

  function handleOcrProcess(text) {
    if (!text || isProcessingFollowUp) return;
    isProcessingFollowUp = true;
    chatHistory.push({ role: 'user', content: text });
    appendMessage(text, 'user', true);

    const loadingEl = appendMessage('Loading', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);

    chrome.runtime.sendMessage({ type: 'askFollowUp', history: chatHistory }, () => {
      if (chrome.runtime.lastError) {
        isProcessingFollowUp = false;
        stopLoadingAnimation();
        if (loadingEl) loadingEl.remove();
        appendMessage(`Error: ${chrome.runtime.lastError.message}`, 'error', true);
      }
    });
  }

  async function runOcrOnBlob(imageBlob) {
    if (!imageBlob || !imageBlob.type.startsWith('image/')) {
      appendMessage('Error: The provided file is not a valid image.', 'error', true);
      return;
    }
    const loadingEl = appendMessage('Extracting text...', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);

    try {
      const base64Data = await blobToBase64(imageBlob);
      chrome.runtime.sendMessage({ type: 'doOcr', imageData: base64Data }, () => {
        if (chrome.runtime.lastError) {
          stopLoadingAnimation();
          if (loadingEl) loadingEl.remove();
          appendMessage(`Error: ${chrome.runtime.lastError.message}`, 'error', true);
        }
      });
    } catch (error) {
      stopLoadingAnimation();
      if (loadingEl) loadingEl.remove();
      appendMessage(`Error: ${error.message || 'Could not process image.'}`, 'error', true);
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) stageImage(file, file.name || 'Image');
    event.target.value = null;
  }

  function handleTextInputPaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        event.preventDefault();
        stageImage(item.getAsFile(), 'Pasted image');
        return;
      }
    }
  }

  function hideModalForSnip() {
    const modal = document.getElementById('screenai-ai-modal');
    if (modal) modal.style.display = 'none';
  }

  function handleScreenshotAttach() {
    screenshotIntent = 'attach';
    hideModalForSnip();
    chrome.runtime.sendMessage({ type: 'initiateScreenshot' });
  }

  function handleTextExtract() {
    screenshotIntent = 'ocr';
    hideModalForSnip();
    chrome.runtime.sendMessage({ type: 'initiateScreenshot' });
  }

  function handleNewChat() {
    chatHistory = [];
    isProcessingFollowUp = false;
    stopLoadingAnimation();
    clearPendingImage();
    const contentEl = document.getElementById('screenai-ai-content');
    if (contentEl) contentEl.innerHTML = '';
    const inputEl = document.getElementById('screenai-ai-input');
    if (inputEl) {
      inputEl.value = '';
      inputEl.style.height = 'auto';
      inputEl.placeholder = "Ask anything…";
    }
  }

  function handleRegenerate(msgDiv) {
    if (isProcessingFollowUp) return;
    const contentEl = document.getElementById('screenai-ai-content');
    const assistantMsgs = Array.from(contentEl.querySelectorAll('.screenai-message.assistant'));
    const assistantIdx = assistantMsgs.indexOf(msgDiv);
    if (assistantIdx < 0) return;

    let historyIdx = -1, count = -1;
    for (let i = 0; i < chatHistory.length; i++) {
      if (chatHistory[i].role === 'assistant') {
        count++;
        if (count === assistantIdx) { historyIdx = i; break; }
      }
    }
    if (historyIdx < 0) return;

    chatHistory = chatHistory.slice(0, historyIdx);

    let node = msgDiv;
    while (node) {
      const next = node.nextElementSibling;
      node.remove();
      node = next;
    }

    isProcessingFollowUp = true;
    const loadingEl = appendMessage('Loading', 'system', true, 'screenai-loading-message');
    startLoadingAnimation(loadingEl);

    chrome.runtime.sendMessage({ type: 'askFollowUp', history: chatHistory }, () => {
      if (chrome.runtime.lastError) {
        isProcessingFollowUp = false;
        stopLoadingAnimation();
        if (loadingEl) loadingEl.remove();
      }
    });
  }

  // ---------- Messages from background ----------
  chrome.runtime.onMessage.addListener((message) => {
    if (!chrome.runtime.id) return;

    if (message.type === 'showModal') {
      const modal = document.getElementById('screenai-ai-modal');
      if (modal) modal.style.display = 'flex';
    }
    else if (message.type === 'screenshotReady') {
      const modal = document.getElementById('screenai-ai-modal');
      if (modal) modal.style.display = 'flex';

      if (!message.base64Data) {
        appendMessage('Error: No image data received.', 'error', true);
        return;
      }

      if (screenshotIntent === 'ocr') {
        const blob = base64ToBlob(message.base64Data, 'image/jpeg');
        runOcrOnBlob(blob);
      } else {
        const blob = base64ToBlob(message.base64Data, 'image/jpeg');
        stageImage(blob, 'Screenshot');
      }
      screenshotIntent = 'attach';
    }
    else if (message.type === 'showLoading') {
      createOrShowModal("Loading...", false, true);
    }
    else if (message.type === 'showResponse') {
      stopLoadingAnimation();
      chatHistory = [];
      chatHistory.push({ role: 'user', content: message.prompt });
      chatHistory.push({ role: 'assistant', content: message.response });
      updateChatDisplay(true);

      const inputEl = document.getElementById('screenai-ai-input');
      if (inputEl) inputEl.placeholder = "Ask a follow-up…";
    }
    else if (message.type === 'showFollowUpResponse') {
      stopLoadingAnimation();
      const loadingEl = document.getElementById('screenai-loading-message');
      if (loadingEl) loadingEl.remove();

      chatHistory.push(message.response);
      appendMessage(message.response.content, 'assistant', true);
      isProcessingFollowUp = false;

      const inputEl = document.getElementById('screenai-ai-input');
      if (inputEl) inputEl.placeholder = "Ask a follow-up…";
    }
    else if (message.type === 'showEmptyModal') {
      createOrShowModal("", false, true);
    }
    else if (message.type === 'showError' || message.type === 'showOcrError') {
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
      isProcessingFollowUp = false;
    }
    else if (message.type === 'showOcrResult') {
      stopLoadingAnimation();
      const loadingEl = document.getElementById('screenai-loading-message');
      if (loadingEl) loadingEl.remove();

      chatHistory = [];
      appendMessage(message.text, 'ocr-result', true);
    }
  });

  // ---------- Modal ----------
  function createOrShowModal(content, isError = false, isNewChat = false) {
    let modal = document.getElementById('screenai-ai-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'screenai-ai-modal';

      modal.innerHTML = `
        <div id="screenai-ai-header">
          <div id="screenai-ai-controls">
            <button id="screenai-close-btn" title="Close">×</button>
            <button id="screenai-minimize-btn" title="Minimize">−</button>
            <button id="screenai-newchat-btn" title="New Chat">${newChatIconSVG}</button>
          </div>
          <span>ScreenAI</span>
        </div>
        <div id="screenai-ai-content"></div>
        <div id="screenai-ai-attachment-preview" style="display:none;">
          <img id="screenai-ai-attachment-thumb" alt="" />
          <span id="screenai-ai-attachment-name"></span>
          <button id="screenai-ai-attachment-remove" title="Remove">×</button>
        </div>
        <div id="screenai-ai-footer">
          <button id="screenai-ocr-btn" class="screenai-footer-btn" title="Extract text (OCR)">${textExtractIconSVG}</button>
          <button id="screenai-attach-btn" class="screenai-footer-btn" title="Attach Image">${attachIconSVG}</button>
          <button id="screenai-snip-btn" class="screenai-footer-btn" title="Take Screenshot">${snipIconSVG}</button>
          <textarea id="screenai-ai-input" rows="1" placeholder="Ask anything…"></textarea>
          <button id="screenai-send-btn" title="Send">${sendIconSVG}</button>
        </div>
        <input type="file" id="screenai-file-input" style="display: none;" accept="image/*" />
      `;

      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';

      document.body.appendChild(modal);

      // ---- Close (hide) ----
      document.getElementById('screenai-close-btn').onclick = () => {
        modal.style.opacity = '0';
        setTimeout(() => {
          modal.style.display = 'none';
          modal.style.opacity = '1';
        }, 200);
      };

      document.getElementById('screenai-minimize-btn').onclick = () => {
        modal.classList.toggle('minimized');
      };

      document.getElementById('screenai-newchat-btn').onclick = handleNewChat;

      // ---- Input ----
      const inputEl = document.getElementById('screenai-ai-input');
      const autoResize = () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 130) + 'px';
      };
      inputEl.addEventListener('input', autoResize);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleFollowUp();
          inputEl.style.height = 'auto';
        }
      });
      document.getElementById('screenai-send-btn').onclick = () => {
        handleFollowUp();
        inputEl.style.height = 'auto';
      };

      // ---- Attach / Screenshot / OCR ----
      document.getElementById('screenai-attach-btn').onclick = () => {
        document.getElementById('screenai-file-input').click();
      };
      document.getElementById('screenai-snip-btn').onclick = handleScreenshotAttach;
      document.getElementById('screenai-ocr-btn').onclick = handleTextExtract;
      document.getElementById('screenai-file-input').onchange = handleFileUpload;
      document.getElementById('screenai-ai-attachment-remove').onclick = clearPendingImage;
      inputEl.onpaste = handleTextInputPaste;

      // ---- Drag & drop onto modal ----
      modal.addEventListener('dragover', (e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          modal.classList.add('dragover');
        }
      });
      modal.addEventListener('dragleave', () => modal.classList.remove('dragover'));
      modal.addEventListener('drop', (e) => {
        modal.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          e.preventDefault();
          stageImage(file, file.name || 'Image');
        }
      });

      // ---- Escape closes ----
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const m = document.getElementById('screenai-ai-modal');
          if (m && m.style.display !== 'none') {
            document.getElementById('screenai-close-btn')?.click();
          }
        }
      });

      // ---- Event delegation ----
      const contentEl = document.getElementById('screenai-ai-content');
      contentEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('screenai-copy-code-btn')) {
          const pre = target.closest('pre');
          const code = pre?.querySelector('code');
          if (code) {
            copyText(code.textContent);
            target.innerHTML = checkIconSVG;
            target.classList.add('screenai-copy-btn-copied');
            setTimeout(() => {
              target.innerHTML = copyIconSVG;
              target.classList.remove('screenai-copy-btn-copied');
            }, 2000);
          }
        }

        if (target.classList.contains('screenai-copy-response-btn')) {
          const msgDiv = target.closest('.screenai-message');
          const clone = msgDiv.cloneNode(true);
          clone.querySelectorAll('button').forEach(btn => btn.remove());
          copyText(clone.textContent);
          target.innerHTML = checkIconSVG;
          target.classList.add('screenai-copy-btn-copied');
          setTimeout(() => {
            target.innerHTML = copyIconSVG;
            target.classList.remove('screenai-copy-btn-copied');
          }, 2000);
        }

        if (target.classList.contains('screenai-regenerate-btn')) {
          const msgDiv = target.closest('.screenai-message');
          handleRegenerate(msgDiv);
        }

        if (target.classList.contains('screenai-copy-ocr-btn')) {
          const pre = target.closest('.screenai-message').querySelector('.screenai-ocr-text');
          if (pre) {
            copyText(pre.textContent);
            target.innerHTML = checkIconSVG;
            target.classList.add('screenai-copy-btn-copied');
            setTimeout(() => {
              target.innerHTML = copyIconSVG;
              target.classList.remove('screenai-copy-btn-copied');
            }, 2000);
          }
        }

        if (target.classList.contains('screenai-process-ocr-btn')) {
          const pre = target.closest('.screenai-message').querySelector('.screenai-ocr-text');
          if (pre) handleOcrProcess(pre.textContent);
        }
      });

      // ---- Drag logic with clamping ----
      let pos3 = 0, pos4 = 0;
      const header = document.getElementById('screenai-ai-header');

      header.onmousedown = (e) => {
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
      };

      function elementDrag(e) {
        e.preventDefault();
        const dx = pos3 - e.clientX;
        const dy = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = modal.offsetTop - dy;
        let newLeft = modal.offsetLeft - dx;

        const maxTop = window.innerHeight - modal.offsetHeight;
        const maxLeft = window.innerWidth - modal.offsetWidth;

        newTop = Math.max(0, Math.min(newTop, maxTop));
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));

        modal.style.top = newTop + "px";
        modal.style.left = newLeft + "px";
      }

      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }

    // ---- Update content ----
    if (isNewChat) {
      const contentEl = document.getElementById('screenai-ai-content');
      contentEl.innerHTML = '';
      chatHistory = [];
      if (isError) {
        appendMessage(content, 'error', true);
      } else if (content) {
        const msgContent = (content === 'Loading...') ? 'Loading' : content;
        const loadingEl = appendMessage(msgContent, 'system', true, 'screenai-loading-message');
        if (content === 'Loading...') startLoadingAnimation(loadingEl);
      }
    } else if (isError) {
      appendMessage(content, 'error', true);
    }

    const inputEl = document.getElementById('screenai-ai-input');
    if (isNewChat && inputEl) {
      inputEl.placeholder = "Ask anything…";
    }

    modal.style.display = 'flex';
    modal.style.opacity = '1';
    if (modal.classList.contains('minimized')) modal.classList.remove('minimized');
  }
})();