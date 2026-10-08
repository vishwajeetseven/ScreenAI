// snipper.js (v4.0)
(() => {
  if (window.hasScreenAISnipper) return;
  window.hasScreenAISnipper = true;

  let startX, startY, overlay, selectionBox;
  let isDragging = false;
  let isTouch = false;

  overlay = document.createElement('div');
  overlay.id = 'screenai-snip-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: '2147483645',
    cursor: 'crosshair',
    touchAction: 'none'
  });
  overlay.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  document.body.appendChild(overlay);

  selectionBox = document.createElement('div');
  selectionBox.id = 'screenai-snip-selection';
  Object.assign(selectionBox.style, {
    position: 'fixed',
    border: '2px dashed #fff',
    boxSizing: 'border-box',
    zIndex: '2147483646',
    visibility: 'hidden',
    pointerEvents: 'none'
  });
  document.body.appendChild(selectionBox);

  overlay.addEventListener('mousedown', onStart);
  overlay.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('keydown', onKeyDown);

  function getPoint(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    isTouch = !!e.touches;

    const p = getPoint(e);
    startX = p.x;
    startY = p.y;

    Object.assign(selectionBox.style, {
      left: startX + 'px',
      top: startY + 'px',
      width: '0px',
      height: '0px',
      visibility: 'visible'
    });

    if (isTouch) {
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    } else {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
    }
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const p = getPoint(e);
    const currentX = p.x;
    const currentY = p.y;

    let width = currentX - startX;
    let height = currentY - startY;
    let left = startX;
    let top = startY;

    if (width < 0) { width = -width; left = currentX; }
    if (height < 0) { height = -height; top = currentY; }

    left = Math.max(0, Math.min(left, window.innerWidth));
    top = Math.max(0, Math.min(top, window.innerHeight));
    width = Math.min(width, window.innerWidth - left);
    height = Math.min(height, window.innerHeight - top);

    Object.assign(selectionBox.style, {
      left: left + 'px',
      top: top + 'px',
      width: width + 'px',
      height: height + 'px'
    });

    overlay.style.clipPath = `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${left}px ${top}px,
      ${left + width}px ${top}px,
      ${left + width}px ${top + height}px,
      ${left}px ${top + height}px,
      ${left}px ${top}px
    )`;
  }

  function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    if (isTouch) {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    } else {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
    }

    const p = getPoint(e);
    const endX = p.x;
    const endY = p.y;

    let x = Math.min(startX, endX);
    let y = Math.min(startY, endY);
    let width = Math.abs(endX - startX);
    let height = Math.abs(endY - startY);

    x = Math.max(0, Math.min(x, window.innerWidth));
    y = Math.max(0, Math.min(y, window.innerHeight));
    width = Math.min(width, window.innerWidth - x);
    height = Math.min(height, window.innerHeight - y);

    cleanup();

    if (width > 5 && height > 5) {
      chrome.runtime.sendMessage({
        type: 'captureRegion',
        x, y, width, height,
        dpr: window.devicePixelRatio || 1
      });
    } else {
      chrome.runtime.sendMessage({ type: 'cancelScreenshot' });
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      cleanup();
      chrome.runtime.sendMessage({ type: 'cancelScreenshot' });
    }
  }

  function cleanup() {
    overlay?.remove();
    selectionBox?.remove();
    document.removeEventListener('keydown', onKeyDown);
    window.hasScreenAISniper = false;
    window.hasScreenAISnipper = false;
  }
})();