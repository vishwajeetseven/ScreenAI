// options.js (Updated for Google AI & OCR.space)

const saveBtn = document.getElementById('save-btn');
const googleApiKeyInput = document.getElementById('google-api-key');
const ocrApiKeyInput = document.getElementById('ocr-api-key'); // New input
const statusEl = document.getElementById('status');

// Save both keys
saveBtn.addEventListener('click', () => {
  const googleApiKey = googleApiKeyInput.value;
  const ocrApiKey = ocrApiKeyInput.value; // Get OCR key

  if (!googleApiKey && !ocrApiKey) {
    statusEl.textContent = 'Please enter at least one key.';
    statusEl.style.color = 'red';
    return;
  }
  
  // Save both keys in one object
  chrome.storage.local.set({ 
    googleApiKey: googleApiKey,
    ocrApiKey: ocrApiKey 
  }, () => {
    statusEl.textContent = 'API keys saved!'; // Updated message
    statusEl.style.color = 'green';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  });
});

// Load both keys when the page opens
document.addEventListener('DOMContentLoaded', () => {
  // Get both keys
  chrome.storage.local.get(['googleApiKey', 'ocrApiKey'], (data) => {
    if (data.googleApiKey) {
      googleApiKeyInput.value = data.googleApiKey;
    }
    if (data.ocrApiKey) {
      ocrApiKeyInput.value = data.ocrApiKey; // Load OCR key
    }
  });
});