// options.js (v4.5) — Multi-provider + custom title

const $ = id => document.getElementById(id);

const providerSelect   = $('active-provider');
const providerDesc     = $('provider-desc');
const keysContainer    = $('provider-keys-container');
const textModelSelect  = $('text-model');
const visionModelSel   = $('vision-model');
const systemPromptEl   = $('system-prompt');
const customTitleEl    = $('custom-title');
const statusEl         = $('status');

const ocrKeyInput      = $('ocr-api-key');
const ocrLangSelect    = $('ocr-language');
const ocrStatus        = $('ocr-status');

let allSettings = {};

function renderProviderDropdown() {
  providerSelect.innerHTML = '';
  listProviders().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.isLocal ? `${p.name} (no key needed)` : p.name;
    providerSelect.appendChild(opt);
  });
}

function renderProviderKeys() {
  keysContainer.innerHTML = '';
  listProviders().forEach(p => {
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.provider = p.id;

    const label = document.createElement('label');
    label.htmlFor = `key-${p.id}`;
    label.textContent = `${p.name} API Key:`;
    field.appendChild(label);

    const row = document.createElement('div');
    row.className = 'row';

    const input = document.createElement('input');
    input.type = 'password';
    input.id = `key-${p.id}`;
    input.placeholder = p.apiKeyPlaceholder || 'Paste key...';
    row.appendChild(input);

    if (!p.isLocal) {
      const testBtn = document.createElement('button');
      testBtn.type = 'button';
      testBtn.className = 'secondary';
      testBtn.textContent = 'Test';
      testBtn.onclick = () => testProvider(p.id, input.value.trim());
      row.appendChild(testBtn);

      const status = document.createElement('span');
      status.className = 'test-status';
      status.id = `status-${p.id}`;
      row.appendChild(status);
    }

    field.appendChild(row);

    if (p.apiKeyUrl) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.innerHTML = p.isLocal
        ? `Install from <a href="${p.apiKeyUrl}" target="_blank">${p.apiKeyUrl}</a>`
        : `Get a key from <a href="${p.apiKeyUrl}" target="_blank">${p.name}</a>.`;
      field.appendChild(hint);
    }

    keysContainer.appendChild(field);
  });
}

function updateVisibleProviderField() {
  const active = providerSelect.value;
  Array.from(keysContainer.children).forEach(el => {
    el.style.display = (el.dataset.provider === active) ? 'block' : 'none';
  });

  const p = getProvider(active);
  providerDesc.textContent = p ? p.description : '';
  renderModelDropdowns(p);
}

function renderModelDropdowns(provider) {
  if (!provider) return;

  textModelSelect.innerHTML = '';
  (provider.textModels || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    textModelSelect.appendChild(opt);
  });

  visionModelSel.innerHTML = '';
  if (provider.supportsVision && provider.visionModels?.length) {
    provider.visionModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      visionModelSel.appendChild(opt);
    });
    visionModelSel.disabled = false;
  } else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Not supported by this provider';
    visionModelSel.appendChild(opt);
    visionModelSel.disabled = true;
  }

  if (allSettings[`${provider.id}_textModel`]) {
    textModelSelect.value = allSettings[`${provider.id}_textModel`];
  }
  if (allSettings[`${provider.id}_visionModel`] && provider.supportsVision) {
    visionModelSel.value = allSettings[`${provider.id}_visionModel`];
  }
}

async function testProvider(providerId, key) {
  const statusEl = $(`status-${providerId}`);
  const provider = getProvider(providerId);
  if (!statusEl || !provider) return;

  if (!key && !provider.isLocal) {
    statusEl.textContent = 'Enter a key first';
    statusEl.className = 'test-status err';
    return;
  }

  statusEl.textContent = 'Testing...';
  statusEl.className = 'test-status';

  try {
    const model = allSettings[`${providerId}_textModel`] || provider.defaultTextModel;
    const headers = { 'Content-Type': 'application/json' };
    switch (provider.authStyle) {
      case 'bearer':  headers['Authorization'] = `Bearer ${key}`; break;
      case 'x-api-key':
        headers['x-api-key'] = key;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        break;
    }
    if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);

    let url = provider.endpoint.replace('{model}', model);
    if (provider.authStyle === 'query-key') {
      url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(key)}`;
    }

    let body;
    if (provider.format === 'anthropic') {
      body = { model, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] };
    } else if (provider.format === 'google') {
      body = { contents: [{ role: 'user', parts: [{ text: 'ping' }] }] };
    } else if (provider.format === 'cohere') {
      body = { model, messages: [{ role: 'user', content: 'ping' }] };
    } else {
      body = { model, messages: [{ role: 'user', content: 'ping' }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = await res.json();
        msg = j?.error?.message || j?.message || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    statusEl.textContent = '✓ Valid';
    statusEl.className = 'test-status ok';
  } catch (e) {
    statusEl.textContent = '✗ ' + e.message;
    statusEl.className = 'test-status err';
  }
}

$('save-btn').addEventListener('click', () => {
  const settings = {
    customTitle: customTitleEl.value.trim(),
    activeProvider: providerSelect.value,
    systemPrompt: systemPromptEl.value,
    ocrApiKey: ocrKeyInput.value.trim(),
    ocrLanguage: ocrLangSelect.value,
    [`${providerSelect.value}_textModel`]: textModelSelect.value,
    [`${providerSelect.value}_visionModel`]: visionModelSel.value
  };

  listProviders().forEach(p => {
    const input = $(`key-${p.id}`);
    if (input) settings[`${p.id}_apiKey`] = input.value.trim();
  });

  chrome.storage.local.set(settings, () => {
    statusEl.textContent = 'Settings saved!';
    statusEl.style.color = 'green';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  renderProviderDropdown();
  renderProviderKeys();

  allSettings = await chrome.storage.local.get(null);

  customTitleEl.value = allSettings.customTitle || '';

  const active = allSettings.activeProvider || 'google';
  providerSelect.value = active;

  listProviders().forEach(p => {
    const input = $(`key-${p.id}`);
    if (input && allSettings[`${p.id}_apiKey`]) {
      input.value = allSettings[`${p.id}_apiKey`];
    }
  });

  if (allSettings.ocrApiKey) ocrKeyInput.value = allSettings.ocrApiKey;
  ocrLangSelect.value = allSettings.ocrLanguage || 'eng';
  systemPromptEl.value = allSettings.systemPrompt || '';

  updateVisibleProviderField();

  providerSelect.addEventListener('change', () => {
    const prev = providerSelect.dataset.prev || active;
    allSettings[`${prev}_textModel`] = textModelSelect.value;
    allSettings[`${prev}_visionModel`] = visionModelSel.value;
    providerSelect.dataset.prev = providerSelect.value;
    updateVisibleProviderField();
  });
  providerSelect.dataset.prev = active;
});

$('test-ocr').addEventListener('click', async () => {
  const key = ocrKeyInput.value.trim();
  if (!key) {
    ocrStatus.textContent = 'Enter a key first';
    ocrStatus.className = 'test-status err';
    return;
  }
  ocrStatus.textContent = 'Testing...';
  ocrStatus.className = 'test-status';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 200, 60);
    ctx.fillStyle = '#000'; ctx.font = 'bold 32px Arial';
    ctx.fillText('TEST', 55, 42);
    const base64 = canvas.toDataURL('image/png').split(',')[1];

    const fd = new FormData();
    fd.append('apikey', key);
    fd.append('base64Image', `data:image/png;base64,${base64}`);
    fd.append('isOverlayRequired', 'false');
    fd.append('language', ocrLangSelect.value);

    const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage[0] : json.ErrorMessage;
      throw new Error(msg || 'OCR error');
    }
    ocrStatus.textContent = '✓ Valid';
    ocrStatus.className = 'test-status ok';
  } catch (e) {
    ocrStatus.textContent = '✗ ' + e.message;
    ocrStatus.className = 'test-status err';
  }
});

$('export-btn').addEventListener('click', () => {
  chrome.storage.local.get(null, (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

$('import-btn').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      chrome.storage.local.set(data, () => {
        statusEl.textContent = 'Settings imported! Reloading...';
        setTimeout(() => location.reload(), 800);
      });
    } catch (err) {
      statusEl.textContent = 'Invalid JSON file.';
      statusEl.style.color = '#c00';
    }
  };
  reader.readAsText(file);
  e.target.value = null;
});