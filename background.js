// background.js (v4.2) — Multi-provider + imageChat + pending attachment support
importScripts('providers.js');

const activeApiCalls = new Map();

// ---------- Helpers ----------

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchWithRetry(url, optionsFactory, retries = 2, timeoutMs = 30000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const options = optionsFactory ? optionsFactory() : {};
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = e;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('fetchWithRetry exhausted');
}

async function fetchImageAsBase64(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    const comma = imageUrl.indexOf(',');
    const meta = imageUrl.substring(5, comma);
    const mimeType = (meta.split(';')[0]) || 'image/png';
    return { mimeType, data: imageUrl.substring(comma + 1) };
  }

  const proxiedUrl = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=${encodeURIComponent(imageUrl)}`;
  const response = await fetchWithRetry(proxiedUrl);
  if (!response.ok) throw new Error(`Failed to fetch image (Status: ${response.status})`);
  const blob = await response.blob();
  const base64Data = await blobToBase64(blob);
  return { mimeType: blob.type || 'image/png', data: base64Data };
}

function safeSendMessage(tabId, message, callback) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('ScreenAI: sendMessage failed', chrome.runtime.lastError.message);
    }
    if (callback) callback(response);
  });
}

async function injectContentScript(tabId) {
  try {
    const probe = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!window.hasScreenAIModal
    });
    if (probe[0]?.result) return true;

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css']
    }).catch(() => {});

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    return true;
  } catch (e) {
    console.error('ScreenAI: Failed to inject content script', e);
    return false;
  }
}

function isRestrictedUrl(url) {
  if (!url) return false;
  return /^(chrome|edge|about|chrome-extension|edge-extension|moz-extension|devtools):/i.test(url)
    || url.startsWith('https://chrome.google.com/webstore')
    || url.startsWith('https://chromewebstore.google.com')
    || url.startsWith('https://microsoftedge.microsoft.com/addons');
}

// ---------- Setup ----------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "sendTextToAI",
      title: "Send selected text to AI",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "summarizeText",
      title: "Summarize with AI",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "explainText",
      title: "Explain with AI",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "translateText",
      title: "Translate with AI",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "sendImageToAI",
      title: "Analyze image with AI",
      contexts: ["image"]
    });
    chrome.contextMenus.create({
      id: "summarizePage",
      title: "Summarize this page with AI",
      contexts: ["page"]
    });
  });
});

// ---------- Context menu ----------

async function startAiRequest(tabId, data, type) {
  const ok = await injectContentScript(tabId);
  if (!ok) return;
  safeSendMessage(tabId, { type: 'showLoading' });
  callAI(data, type, tabId);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  if (isRestrictedUrl(tab.url)) return;

  if (info.menuItemId === "sendTextToAI") {
    startAiRequest(tab.id, info.selectionText, 'text');
  } else if (info.menuItemId === "summarizeText") {
    startAiRequest(tab.id, `Summarize the following text concisely:\n\n${info.selectionText}`, 'text');
  } else if (info.menuItemId === "explainText") {
    startAiRequest(tab.id, `Explain the following text in plain language:\n\n${info.selectionText}`, 'text');
  } else if (info.menuItemId === "translateText") {
    startAiRequest(tab.id, `Translate the following text to English (or if already English, translate to Spanish). Return only the translation:\n\n${info.selectionText}`, 'text');
  } else if (info.menuItemId === "sendImageToAI") {
    startAiRequest(tab.id, info.srcUrl, 'image');
  } else if (info.menuItemId === "summarizePage") {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText.slice(0, 12000)
    }).catch(() => null);
    const text = results?.[0]?.result;
    if (text) {
      startAiRequest(tab.id, `Summarize this page:\n\n${text}`, 'text');
    }
  }
});

// ---------- Keyboard shortcut ----------

chrome.commands.onCommand.addListener(async (command) => {
  console.log('ScreenAI: command received:', command);
  if (command !== "activate-ai") return;

  let tab;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  } catch (e) {
    console.error('ScreenAI: failed to query active tab', e);
    return;
  }

  if (!tab || !tab.id) {
    console.warn('ScreenAI: no active tab found');
    return;
  }

  if (isRestrictedUrl(tab.url)) {
    console.warn('ScreenAI: cannot run on restricted page:', tab.url);
    return;
  }

  let selectionData = null;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection().toString().trim();
        if (selection) return { type: 'text', data: selection };

        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IMG' && activeEl.src) {
          return { type: 'image', data: activeEl.src };
        }
        return null;
      }
    });
    selectionData = results?.[0]?.result;
  } catch (e) {
    console.warn('ScreenAI: cannot read selection', e);
  }

  const ok = await injectContentScript(tab.id);
  if (!ok) {
    console.error('ScreenAI: failed to inject content script');
    return;
  }

  if (selectionData) {
    safeSendMessage(tab.id, { type: 'showLoading' });
    callAI(selectionData.data, selectionData.type, tab.id);
  } else {
    safeSendMessage(tab.id, { type: 'showEmptyModal' });
  }
});

// ---------- Action click ----------

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// ---------- Messages ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab || !sender.tab.id) {
    sendResponse({ status: 'error', error: 'No tab id' });
    return false;
  }
  const tabId = sender.tab.id;
  const windowId = sender.tab.windowId;

  switch (message.type) {
    case 'askFollowUp':
      sendResponse({ status: 'ok' });
      callAI(message.history, 'followUp', tabId);
      return false;

    case 'imageChat':
      sendResponse({ status: 'ok' });
      callImageChat(message.prompt, message.imageBase64, tabId);
      return false;

    case 'doOcr':
      sendResponse({ status: 'ok' });
      callOcrSpace(message.imageData, tabId);
      return false;

    case 'initiateScreenshot':
      sendResponse({ status: 'ok' });
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['snipper.js']
      }).catch((error) => {
        console.error('ScreenAI: Failed to inject snipper.js', error);
        safeSendMessage(tabId, { type: 'showError', data: 'Failed to initialize screenshot tool.' });
      });
      return false;

    case 'cancelScreenshot':
      sendResponse({ status: 'ok' });
      safeSendMessage(tabId, { type: 'showModal' });
      return false;

    case 'captureRegion': {
      sendResponse({ status: 'ok' });
      if (typeof message.x !== 'number' || typeof message.y !== 'number' ||
          typeof message.width !== 'number' || typeof message.height !== 'number' ||
          typeof message.dpr !== 'number' || message.width <= 0 || message.height <= 0) {
        console.error('ScreenAI: Invalid capture region coordinates', message);
        safeSendMessage(tabId, { type: 'showError', data: 'Invalid screenshot region.' });
        return false;
      }

      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          console.error("Failed to capture tab:", chrome.runtime.lastError || "No data URL");
          safeSendMessage(tabId, { type: 'showError', data: 'Failed to capture screen. Please try again.' });
          return;
        }
        try {
          const croppedBase64 = await cropImage(dataUrl, message.x, message.y, message.width, message.height, message.dpr);
          safeSendMessage(tabId, { type: 'screenshotReady', base64Data: croppedBase64 });
        } catch (error) {
          console.error('ScreenAI Crop Error:', error);
          safeSendMessage(tabId, { type: 'showError', data: 'Failed to crop screenshot.' });
        }
      });
      return false;
    }
  }

  sendResponse({ status: 'unknown' });
  return false;
});

// ---------- Crop ----------

async function cropImage(dataUrl, x, y, width, height, dpr) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    imageBitmap,
    x * dpr, y * dpr, width * dpr, height * dpr,
    0, 0, width * dpr, height * dpr
  );

  let quality = 0.92;
  let croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

  const MAX_BYTES = 1_000_000;
  while (croppedBlob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  return blobToBase64(croppedBlob);
}

// ---------- OCR ----------

async function callOcrSpace(base64Data, tabId) {
  const key = `ocr-${tabId}`;
  if (activeApiCalls.has(key)) return;
  activeApiCalls.set(key, true);

  try {
    const { ocrApiKey, ocrLanguage = 'eng' } = await chrome.storage.local.get(['ocrApiKey', 'ocrLanguage']);
    if (!ocrApiKey) {
      throw new Error('OCR.space API key not set. Open Options to add it.');
    }

    const makeBody = () => {
      const fd = new FormData();
      fd.append('apikey', ocrApiKey);
      fd.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
      fd.append('isOverlayRequired', 'false');
      fd.append('detectOrientation', 'true');
      fd.append('scale', 'true');
      fd.append('language', ocrLanguage);
      return fd;
    };

    const response = await fetchWithRetry(
      'https://api.ocr.space/parse/image',
      () => ({ method: 'POST', body: makeBody() })
    );

    if (!response.ok) throw new Error(`OCR.space API Error: ${response.statusText}`);

    const json = await response.json();

    if (json.IsErroredOnProcessing) {
      const errorMsg = (Array.isArray(json.ErrorMessage) && json.ErrorMessage[0])
        ? json.ErrorMessage[0]
        : (json.ErrorMessage || 'Unknown OCR error');
      throw new Error(`OCR.space Error: ${errorMsg}`);
    }

    if (!json.ParsedResults || json.ParsedResults.length === 0) {
      throw new Error('No text could be extracted from the image.');
    }

    const extractedText = json.ParsedResults[0].ParsedText || '';
    safeSendMessage(tabId, { type: 'showOcrResult', text: extractedText });
  } catch (error) {
    console.error('ScreenAI OCR Error:', error);
    safeSendMessage(tabId, { type: 'showOcrError', data: error.message });
  } finally {
    activeApiCalls.delete(key);
  }
}

// ---------- AI (multi-provider) ----------

async function getActiveProviderSettings() {
  const data = await chrome.storage.local.get(null);
  const providerId = data.activeProvider || 'google';
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  const apiKey = data[`${providerId}_apiKey`] || '';
  const textModel = data[`${providerId}_textModel`] || provider.defaultTextModel;
  const visionModel = data[`${providerId}_visionModel`] || provider.defaultVisionModel;
  const systemPrompt = data.systemPrompt || '';

  if (!provider.isLocal && !apiKey) {
    throw new Error(`${provider.name} API key not set. Open Options to add it.`);
  }

  return { provider, apiKey, textModel, visionModel, systemPrompt };
}

function buildHeaders(provider, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  switch (provider.authStyle) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'x-api-key':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      break;
    case 'query-key':
    case 'none':
      break;
  }
  if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);
  return headers;
}

function toOpenAIMessages(history) {
  return history.map(m => ({ role: m.role, content: m.content }));
}

function toAnthropicMessages(history, systemPrompt) {
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  const body = { messages };
  if (systemPrompt) body.system = systemPrompt;
  return body;
}

function toGoogleContents(history, systemPrompt) {
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const body = { contents };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  return body;
}

function toCohereMessages(history, systemPrompt) {
  const messages = history.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  const body = { messages };
  if (systemPrompt) body.messages.unshift({ role: 'system', content: systemPrompt });
  return body;
}

function buildRequestBody(provider, history, model, systemPrompt) {
  switch (provider.format) {
    case 'openai': {
      const body = { model, messages: toOpenAIMessages(history) };
      if (systemPrompt) body.messages.unshift({ role: 'system', content: systemPrompt });
      return body;
    }
    case 'anthropic': {
      const body = toAnthropicMessages(history, systemPrompt);
      body.model = model;
      body.max_tokens = 4096;
      return body;
    }
    case 'google':
      return toGoogleContents(history, systemPrompt);
    case 'cohere': {
      const body = toCohereMessages(history, systemPrompt);
      body.model = model;
      return body;
    }
    default:
      throw new Error(`Unsupported provider format: ${provider.format}`);
  }
}

function buildVisionRequestBody(provider, base64Data, mimeType, promptText, model, systemPrompt) {
  switch (provider.format) {
    case 'openai': {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      });
      return { model, messages };
    }
    case 'anthropic': {
      const body = {
        model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }
          ]
        }]
      };
      if (systemPrompt) body.system = systemPrompt;
      return body;
    }
    case 'google': {
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { text: promptText },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }]
      };
      if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
      return body;
    }
    case 'cohere': {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      });
      return { model, messages };
    }
    default:
      throw new Error(`Vision not supported by format: ${provider.format}`);
  }
}

function parseResponseText(provider, json) {
  switch (provider.format) {
    case 'openai':
      return json.choices?.[0]?.message?.content || '';
    case 'anthropic':
      return json.content?.[0]?.text || '';
    case 'google':
      return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'cohere':
      return json.message?.content?.[0]?.text
          || (typeof json.message?.content === 'string' ? json.message.content : '')
          || json.text
          || '';
    default:
      throw new Error(`Unknown provider format: ${provider.format}`);
  }
}

function extractErrorMessage(provider, json, statusText) {
  const fallback = `${provider.name} Error: ${statusText}`;
  try {
    if (json?.error?.message) return `${provider.name} Error: ${json.error.message}`;
    if (json?.error?.type) return `${provider.name} Error: ${json.error.type}`;
    if (typeof json?.error === 'string') return `${provider.name} Error: ${json.error}`;
    if (json?.message) return `${provider.name} Error: ${json.message}`;
  } catch (_) {}
  return fallback;
}

async function callAI(data, type, tabId) {
  const callKey = `${tabId}-${type}`;
  if (activeApiCalls.has(callKey)) return;
  activeApiCalls.set(callKey, true);

  try {
    const { provider, apiKey, textModel, visionModel, systemPrompt } =
      await getActiveProviderSettings();

    let url, headers, body, model;
    let promptForHistory = data;

    if (type === 'text') {
      model = textModel;
      const history = [{ role: 'user', content: data }];
      body = buildRequestBody(provider, history, model, systemPrompt);
      url = provider.endpoint.replace('{model}', model);
      headers = buildHeaders(provider, apiKey);
      if (provider.authStyle === 'query-key') {
        url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(apiKey)}`;
      }

    } else if (type === 'image') {
      if (!provider.supportsVision) {
        throw new Error(`${provider.name} does not support image analysis.`);
      }
      model = visionModel || provider.defaultVisionModel;
      const promptText = 'Describe this image in detail.';
      promptForHistory = `Analyze image: ${data}`;

      const img = await fetchImageAsBase64(data);
      body = buildVisionRequestBody(provider, img.data, img.mimeType, promptText, model, systemPrompt);
      url = provider.endpoint.replace('{model}', model);
      headers = buildHeaders(provider, apiKey);
      if (provider.authStyle === 'query-key') {
        url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(apiKey)}`;
      }

    } else if (type === 'followUp') {
      model = textModel;
      body = buildRequestBody(provider, data, model, systemPrompt);
      url = provider.endpoint.replace('{model}', model);
      headers = buildHeaders(provider, apiKey);
      if (provider.authStyle === 'query-key') {
        url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(apiKey)}`;
      }
    }

    const response = await fetchWithRetry(url, () => ({
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }));

    if (!response.ok) {
      let errJson = null;
      try { errJson = await response.json(); } catch (_) {}
      throw new Error(extractErrorMessage(provider, errJson, response.statusText));
    }

    let json;
    try { json = await response.json(); }
    catch (_) { throw new Error(`Invalid JSON response from ${provider.name}`); }

    const text = parseResponseText(provider, json);
    if (!text) {
      if (json.promptFeedback?.blockReason) {
        throw new Error(`Request blocked: ${json.promptFeedback.blockReason}`);
      }
      throw new Error(`Empty response from ${provider.name}.`);
    }

    const assistantMessage = { role: 'assistant', content: text };

    if (type === 'text' || type === 'image') {
      safeSendMessage(tabId, {
        type: 'showResponse',
        response: assistantMessage.content,
        prompt: promptForHistory
      });
    } else if (type === 'followUp') {
      safeSendMessage(tabId, {
        type: 'showFollowUpResponse',
        response: assistantMessage
      });
    }

  } catch (error) {
    console.error('ScreenAI AI Error:', error);
    safeSendMessage(tabId, { type: 'showError', data: error.message || 'An unknown error occurred' });
  } finally {
    activeApiCalls.delete(callKey);
  }
}

// ---------- Image chat (pending attachment) ----------

async function callImageChat(prompt, imageBase64, tabId) {
  const callKey = `${tabId}-imageChat`;
  if (activeApiCalls.has(callKey)) return;
  activeApiCalls.set(callKey, true);

  try {
    const { provider, apiKey, visionModel, systemPrompt } =
      await getActiveProviderSettings();

    if (!provider.supportsVision) {
      throw new Error(`${provider.name} does not support image analysis.`);
    }

    const model = visionModel || provider.defaultVisionModel;
    const promptText = (prompt || '').trim() || 'Describe this image in detail.';

    const body = buildVisionRequestBody(
      provider,
      imageBase64,
      'image/jpeg',
      promptText,
      model,
      systemPrompt
    );

    let url = provider.endpoint.replace('{model}', model);
    const headers = buildHeaders(provider, apiKey);
    if (provider.authStyle === 'query-key') {
      url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(apiKey)}`;
    }

    const response = await fetchWithRetry(url, () => ({
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }));

    if (!response.ok) {
      let errJson = null;
      try { errJson = await response.json(); } catch (_) {}
      throw new Error(extractErrorMessage(provider, errJson, response.statusText));
    }

    let json;
    try { json = await response.json(); }
    catch (_) { throw new Error(`Invalid JSON response from ${provider.name}`); }

    const text = parseResponseText(provider, json);
    if (!text) {
      if (json.promptFeedback?.blockReason) {
        throw new Error(`Request blocked: ${json.promptFeedback.blockReason}`);
      }
      throw new Error(`Empty response from ${provider.name}.`);
    }

    safeSendMessage(tabId, {
      type: 'showResponse',
      response: text,
      prompt: promptText
    });

  } catch (error) {
    console.error('ScreenAI Image Chat Error:', error);
    safeSendMessage(tabId, { type: 'showError', data: error.message || 'An unknown error occurred' });
  } finally {
    activeApiCalls.delete(callKey);
  }
}