// snipper.js (Updated for clear selection area)

(() => {
  // --- Guard against multiple injections ---
  if (window.hasScreenAISnipper) {
    return;
  }
  window.hasScreenAISnipper = true;

  let startX, startY, overlay, selectionBox;
  let isDragging = false;
  
  // --- Create Overlay (the dimming) ---
  overlay = document.createElement('div');
  overlay.id = 'screenai-snip-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0, 0, 0, 0.3)';
  overlay.style.zIndex = '2147483645'; 
  overlay.style.cursor = 'crosshair';
  // --- NEW: Use clip-path to punch a "hole" ---
  overlay.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'; // Full overlay initially
  document.body.appendChild(overlay);

  // --- Create Selection Box (just the border) ---
  selectionBox = document.createElement('div');
  selectionBox.id = 'screenai-snip-selection';
  selectionBox.style.position = 'fixed';
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.boxSizing = 'border-box'; // Ensure border is included in size
  // --- MODIFIED: Remove background ---
  // selectionBox.style.background = 'rgba(255, 255, 255, 0.1)'; 
  selectionBox.style.zIndex = '2147483646'; // On top
  selectionBox.style.visibility = 'hidden';
  // --- NEW: Make transparent to mouse events ---
  selectionBox.style.pointerEvents = 'none'; 
  document.body.appendChild(selectionBox);

  // --- Event Listeners ---
  // Listen on the overlay
  overlay.addEventListener('mousedown', onMouseDown); 
  document.addEventListener('keydown', onKeyDown);

  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation(); 
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.visibility = 'visible';
    
    // Add move/up listeners to the document
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const currentX = e.clientX;
    const currentY = e.clientY;

    // Calculate box dimensions
    let width = currentX - startX;
    let height = currentY - startY;
    let left = startX;
    let top = startY;

    if (width < 0) {
      width = -width;
      left = currentX;
    }
    if (height < 0) {
      height = -height;
      top = currentY;
    }

    // Resize dashed border box
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    // --- NEW: Update clip-path to punch a hole ---
    // This creates an "outer" polygon for the whole screen
    // and an "inner" polygon for the selection, creating a hole.
    overlay.style.clipPath = `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${left}px ${top}px, 
      ${left + width}px ${top}px, 
      ${left + width}px ${top + height}px, 
      ${left}px ${top + height}px,
      ${left}px ${top}px
    )`;
    // --- END NEW ---
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    
    // Remove global listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    const endX = e.clientX;
    const endY = e.clientY;

    let x = Math.min(startX, endX);
    let y = Math.min(startY, endY);
    let width = Math.abs(endX - startX);
    let height = Math.abs(endY - startY);

    cleanup(); // Clean up UI

    if (width > 5 && height > 5) {
      // Send message to background
      chrome.runtime.sendMessage({
        type: 'captureRegion',
        x: x,
        y: y,
        width: width,
        height: height,
        dpr: window.devicePixelRatio
      });
    } else {
      // Invalid snip
      chrome.runtime.sendMessage({ type: 'cancelScreenshot' });
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      isDragging = false; // Just in case
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      cleanup();
      chrome.runtime.sendMessage({ type: 'cancelScreenshot' });
    }
  }

  function cleanup() {
    if (overlay.parentElement) {
      overlay.remove();
    }
    if (selectionBox.parentElement) {
      selectionBox.remove();
    }
    document.removeEventListener('keydown', onKeyDown);
    window.hasScreenAISnipper = false;
  }
})();