// background.js (Updated for Snipping Tool)

// --- Helper: Convert chat history from OpenAI format to Google format ---
function messagesToContents(messages) {
  return messages.map(msg => ({
    // Google uses "model" for the assistant role
    role: (msg.role === 'assistant') ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}

// --- Helper: Fetch an image from a URL and convert it to Base64 ---
async function blobToBase64(blob) {
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

async function fetchImageAsBase64(imageUrl) {
  // Use Google's proxy to bypass CORS issues
  const proxiedUrl = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=${encodeURIComponent(imageUrl)}`;
  
  const response = await fetch(proxiedUrl);
  if (!response.ok) throw new Error(`Failed to fetch image (Status: ${response.status})`);
  
  const blob = await response.blob();
  const base64Data = await blobToBase64(blob);
  
  return {
    mimeType: blob.type,
    data: base64Data
  };
}
// --- End of Helpers ---


// --- Setup ---
chrome.runtime.onInstalled.addListener(() => {
  // 1. Context Menu for Typing Simulator
  chrome.contextMenus.create({
    id: "writeClipboardText",
    title: "Simulate Typing from Clipboard",
    contexts: ["editable"]
  });
  // 2. Context Menu for AI (Text)
  chrome.contextMenus.create({
    id: "sendTextToAI",
    title: "Send selected text to AI",
    contexts: ["selection"]
  });
  // 3. Context Menu for AI (Image)
  chrome.contextMenus.create({
    id: "sendImageToAI",
    title: "Analyze image with AI",
    contexts: ["image"]
  });
});

// --- Listen for Context Menu Clicks ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "writeClipboardText") {
    // Note: This file "writer.js" was not provided, but the listener is kept.
    // Make sure you have this file if you use this feature.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["writer.js"]
      });
    } catch(e) {
      console.warn("ScreenAI: Could not execute writer.js. Make sure the file exists.");
    }
    
  } else if (info.menuItemId === "sendTextToAI" || info.menuItemId === "sendImageToAI") {
    await injectContentScript(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'showLoading' });

    if (info.menuItemId === "sendTextToAI") {
      callGoogleAI(info.selectionText, 'text', tab.id);
    } else {
      callGoogleAI(info.srcUrl, 'image', tab.id);
    }
  }
});

// --- Listen for Keyboard Shortcuts ---
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "activate-writer") {
    // Note: This file "writer.js" was not provided, but the listener is kept.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["writer.js"]
      });
    } catch(e) {
      console.warn("ScreenAI: Could not execute writer.js. Make sure the file exists.");
    }
    
  } else if (command === "activate-ai") {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection().toString().trim();
        if (selection) {
          return { type: 'text', data: selection };
        }
        
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IMG' && activeEl.src) {
          return { type: 'image', data: activeEl.src };
        }
        
        return null; // Nothing found
      }
    });
    
    const selectionData = results[0].result;
    
    await injectContentScript(tab.id);
    
    if (selectionData) {
      chrome.tabs.sendMessage(tab.id, { type: 'showLoading' });
      if (selectionData.type === 'text') {
        callGoogleAI(selectionData.data, 'text', tab.id);
      } else if (selectionData.type === 'image') {
        callGoogleAI(selectionData.data, 'image', tab.id);
      }
    } else {
      chrome.tabs.sendMessage(tab.id, { type: 'showEmptyModal' });
    }
  }
});

// --- Listen for click on extension icon ---
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// --- Listen for messages from content.js / snipper.js ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'askFollowUp') {
    callGoogleAI(message.history, 'followUp', sender.tab.id);
    return true; // Indicates async response
  }
  else if (message.type === 'doOcr') {
    callOcrSpace(message.imageData, sender.tab.id);
    return true; // Indicates async response
  }
  // --- NEW: Snipping Tool Listeners ---
  else if (message.type === 'initiateScreenshot') {
    // Inject the snipping script
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['snipper.js']
    });
    return true;
  }
  else if (message.type === 'cancelScreenshot') {
    // Tell content.js to show the modal again
    chrome.tabs.sendMessage(sender.tab.id, { type: 'showModal' });
    return true;
  }
  else if (message.type === 'captureRegion') {
    // 1. Capture the visible tab
    chrome.tabs.captureVisibleTab(async (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
          console.error("Failed to capture tab:", chrome.runtime.lastError || "No data URL returned");
          chrome.tabs.sendMessage(sender.tab.id, { type: 'showError', data: 'Failed to capture screen. Please try again.' });
          return;
      }
      
      try {
        // 2. Crop the image
        const croppedBase64 = await cropImage(dataUrl, message.x, message.y, message.width, message.height, message.dpr);
        
        // 3. Send cropped image to content.js for OCR
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'screenshotReady',
          base64Data: croppedBase64
        });
      } catch (error) {
        console.error('ScreenAI Crop Error:', error);
        chrome.tabs.sendMessage(sender.tab.id, { type: 'showError', data: 'Failed to crop screenshot.' });
      }
    });
    return true; // Indicates async response
  }
});

// --- NEW: Cropping function using OffscreenCanvas ---
async function cropImage(dataUrl, x, y, width, height, dpr) {
  // 1. Fetch data URL as a blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // 2. Create an ImageBitmap
  const imageBitmap = await createImageBitmap(blob);

  // 3. Create an OffscreenCanvas
  const canvas = new OffscreenCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');

  // 4. Draw the cropped region
  // sX, sY, sWidth, sHeight, dX, dY, dWidth, dHeight
  ctx.drawImage(
    imageBitmap,
    x * dpr,
    y * dpr,
    width * dpr,
    height * dpr,
    0, 0,
    width * dpr,
    height * dpr
  );

  // 5. Convert canvas to blob
  const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg' });

  // 6. Convert blob to Base64
  const base64Data = await blobToBase64(croppedBlob);
  return base64Data;
}


// --- OCR.space Core Function ---
async function callOcrSpace(base64Data, tabId) {
  try {
    // 1. Get the OCR API Key
    const { ocrApiKey } = await chrome.storage.local.get('ocrApiKey');
    if (!ocrApiKey) {
      throw new Error('OCR.space API key not set. Right-click the extension icon and go to Options.');
    }

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('apikey', ocrApiKey);
    // Send as full Data URL. OCR.space handles this.
    formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true'); // Auto-rotate
    formData.append('scale', 'true'); // Auto-scale

    // 3. Make the API call
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OCR.space API Error: ${response.statusText}`);
    }

    const json = await response.json();

    // 4. Handle API-side errors
    if (json.IsErroredOnProcessing) {
      throw new Error(`OCR.space Error: ${json.ErrorMessage[0]}`);
    }

    if (!json.ParsedResults || json.ParsedResults.length === 0) {
      throw new Error('No text could be extracted from the image.');
    }

    // 5. Success: Send extracted text back to content script
    const extractedText = json.ParsedResults[0].ParsedText;
    chrome.tabs.sendMessage(tabId, { 
      type: 'showOcrResult', 
      text: extractedText 
    });

  } catch (error) {
    console.error('ScreenAI OCR Error:', error);
    // Use 'showOcrError' to be handled by the same logic as 'showError'
    chrome.tabs.sendMessage(tabId, { type: 'showOcrError', data: error.message });
  }
}

// --- Google AI Core Function ---
async function callGoogleAI(data, type, tabId) {
  try {
    // 1. Get the new Google API Key from storage
    const { googleApiKey } = await chrome.storage.local.get('googleApiKey');
    if (!googleApiKey) {
      throw new Error('Google AI API key not set. Right-click the extension icon and go to Options.');
    }

    let model = 'gemini-2.5-flash'; // --- Default to gemini-2.5-flash for text
    let contents;
    let promptForHistory = data; // The prompt text we send back to content.js

    if (type === 'text') {
      contents = [{ role: 'user', parts: [{ text: data }] }];
      
    } else if (type === 'image') {
      model = 'gemini-2.5-pro'; // --- Use gemini-2.5-pro for vision
      const promptText = "Describe this image in detail.";
      promptForHistory = `Analyze image: ${data}`; // For chat history
      
      // Fetch and convert the image
      const imageData = await fetchImageAsBase64(data);
      
      contents = [{
        role: 'user',
        parts: [
          { text: promptText },
          { inlineData: { mimeType: imageData.mimeType, data: imageData.data } }
        ]
      }];
      
    } else if (type === 'followUp') {
      // Follow-ups will use the default 'gemini-2.5-flash' model
      contents = messagesToContents(data); // 'data' is the full chat history
    }
    
    // 2. Construct the Google AI API URL and Request
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents: contents })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google AI Error: ${errorData.error.message}`);
    }

    const json = await response.json();
    
    // 3. Handle Google's safety blocking
    if (!json.candidates || json.candidates.length === 0) {
      if (json.promptFeedback && json.promptFeedback.blockReason) {
         throw new Error(`Request blocked by Google for safety reasons: ${json.promptFeedback.blockReason}`);
      }
      throw new Error('No response from Google AI. The prompt might have been blocked.');
    }

    // 4. Parse the response and format it for content.js
    const assistantResponseContent = json.candidates[0].content.parts[0].text;
    
    // We *must* send role: "assistant" back to content.js for the chat bubbles to work
    const assistantResponseObject = { role: 'assistant', content: assistantResponseContent };

    // 5. Send data back to the content script
    if (type === 'text' || type === 'image') {
      chrome.tabs.sendMessage(tabId, { 
        type: 'showResponse', 
        response: assistantResponseObject.content, // Just the text
        prompt: promptForHistory // The original prompt
      });
    } else if (type === 'followUp') {
      chrome.tabs.sendMessage(tabId, { 
        type: 'showFollowUpResponse', 
        response: assistantResponseObject // The full {role, content} object
      });
    }

  } catch (error) {
    console.error('ScreenAI Google AI Error:', error);
    chrome.tabs.sendMessage(tabId, { type: 'showError', data: error.message });
  }
}

// --- Helper to inject AI Modal script ---
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  } catch (e) {
    // This warning is normal if the script is already injected
  }
}