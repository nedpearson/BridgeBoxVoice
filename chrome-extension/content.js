/**
 * Bridgebox Voice Capture — Content Script
 * Injects a floating capture button into every page.
 * Handles DOM extraction, network logging, and MediaRecorder for screen recording.
 */

(function () {
  'use strict';

  // Don't inject on chrome:// pages or already-injected pages
  if (document.getElementById('bridgebox-root')) return;

  // ─── State ────────────────────────────────────────────────────────────────
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingStream = null;
  let panelOpen = false;

  // ─── Create Floating Button ──────────────────────────────────────────────

  const root = document.createElement('div');
  root.id = 'bridgebox-root';
  document.body.appendChild(root);

  const fab = document.createElement('button');
  fab.id = 'bridgebox-fab';
  fab.title = 'Bridgebox Voice Capture';
  fab.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  `;
  root.appendChild(fab);

  // ─── Action Panel ────────────────────────────────────────────────────────

  const panel = document.createElement('div');
  panel.id = 'bridgebox-panel';
  panel.className = 'bb-panel bb-hidden';
  panel.innerHTML = `
    <div class="bb-panel-header">
      <span class="bb-logo">Bridgebox Voice Capture</span>
      <button class="bb-close" id="bb-close-btn">✕</button>
    </div>
    <div class="bb-actions">
      <button class="bb-action-btn" id="bb-screenshot-btn">
        <span class="bb-action-icon">📸</span>
        <span>Screenshot</span>
      </button>
      <button class="bb-action-btn" id="bb-record-btn">
        <span class="bb-action-icon">🔴</span>
        <span>Record Screen</span>
      </button>
      <button class="bb-action-btn" id="bb-dom-btn">
        <span class="bb-action-icon">🌳</span>
        <span>Extract DOM</span>
      </button>
      <button class="bb-action-btn" id="bb-network-btn">
        <span class="bb-action-icon">📡</span>
        <span>Network Snapshot</span>
      </button>
      <button class="bb-action-btn" id="bb-sidebar-btn">
        <span class="bb-action-icon">⚡</span>
        <span>Open Sidebar</span>
      </button>
    </div>
    <div class="bb-status" id="bb-status"></div>
  `;
  root.appendChild(panel);

  // ─── Recording Indicator ─────────────────────────────────────────────────

  const recIndicator = document.createElement('div');
  recIndicator.id = 'bb-recording-indicator';
  recIndicator.className = 'bb-hidden';
  recIndicator.innerHTML = `
    <span class="bb-rec-dot"></span>
    <span class="bb-rec-label">REC</span>
    <button class="bb-stop-btn" id="bb-stop-rec">■ Stop</button>
  `;
  root.appendChild(recIndicator);

  // ─── Event Handlers ──────────────────────────────────────────────────────

  fab.addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel.classList.toggle('bb-hidden', !panelOpen);
    fab.classList.toggle('bb-active', panelOpen);
  });

  document.getElementById('bb-close-btn').addEventListener('click', () => {
    panelOpen = false;
    panel.classList.add('bb-hidden');
    fab.classList.remove('bb-active');
  });

  // Screenshot
  document.getElementById('bb-screenshot-btn').addEventListener('click', async () => {
    setStatus('📸 Taking screenshot...');
    panel.classList.add('bb-hidden');
    await new Promise(r => setTimeout(r, 150)); // brief delay so panel hides

    const response = await sendToBackground({ type: 'SCREENSHOT' });
    if (response?.ok) {
      setStatus(`✅ Screenshot saved!`, 3000);
    } else {
      setStatus(`❌ ${response?.error || 'Screenshot failed'}`, 4000);
    }
    panelOpen = false;
  });

  // Record
  document.getElementById('bb-record-btn').addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
      return;
    }
    setStatus('🎬 Requesting screen access...');
    const response = await sendToBackground({ type: 'START_RECORDING' });
    if (response?.ok) {
      setStatus('🔴 Recording... click Stop when done.');
      panel.classList.add('bb-hidden');
      panelOpen = false;
    } else {
      setStatus(`❌ ${response?.error || 'Recording failed'}`, 4000);
    }
  });

  // DOM extraction
  document.getElementById('bb-dom-btn').addEventListener('click', async () => {
    setStatus('🌳 Extracting DOM...');
    const snapshot = extractDOM();
    const response = await sendToBackground({
      type: 'SAVE_DOM_SNAPSHOT',
      snapshot,
      tabUrl: window.location.href,
    });
    if (response?.ok) {
      setStatus(`✅ DOM snapshot saved (${snapshot.elementCount} elements)`, 3000);
    } else {
      setStatus(`❌ ${response?.error || 'Save failed'}`, 4000);
    }
  });

  // Network snapshot
  document.getElementById('bb-network-btn').addEventListener('click', async () => {
    setStatus('📡 Capturing network data...');
    const entries = performance.getEntriesByType('resource').map((e) => ({
      name: e.name,
      type: e.initiatorType,
      duration: Math.round(e.duration),
      size: e.transferSize,
      status: e.responseStatus,
    }));
    const snapshot = { url: window.location.href, capturedAt: new Date().toISOString(), entries };
    const response = await sendToBackground({
      type: 'SAVE_DOM_SNAPSHOT', // reuse same upload path
      snapshot,
      tabUrl: window.location.href,
    });
    if (response?.ok) {
      setStatus(`✅ Network log saved (${entries.length} requests)`, 3000);
    } else {
      setStatus(`❌ Save failed`, 4000);
    }
  });

  // Sidebar
  document.getElementById('bb-sidebar-btn').addEventListener('click', () => {
    sendToBackground({ type: 'OPEN_SIDEBAR' });
    panel.classList.add('bb-hidden');
    panelOpen = false;
  });

  // Stop recording button
  document.getElementById('bb-stop-rec').addEventListener('click', stopRecording);

  // ─── Listen for messages from background ─────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'START_RECORDING_WITH_STREAM') {
      startRecordingWithStream(message.streamId);
    }
  });

  // ─── Recording Logic ─────────────────────────────────────────────────────

  async function startRecordingWithStream(streamId) {
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30,
          },
        },
      });

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorder.addEventListener('dataavailable', (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      });
      mediaRecorder.addEventListener('stop', handleRecordingStop);
      mediaRecorder.start(1000); // collect chunks every second

      recIndicator.classList.remove('bb-hidden');
      document.getElementById('bb-record-btn').querySelector('span').textContent = '⏹️';
    } catch (err) {
      console.error('[Bridgebox Voice] Recording failed:', err);
      setStatus(`❌ Recording failed: ${err.message}`, 4000);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    recIndicator.classList.add('bb-hidden');
  }

  async function handleRecordingStop() {
    if (recordingStream) {
      recordingStream.getTracks().forEach((t) => t.stop());
      recordingStream = null;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    recordedChunks = [];

    setStatus('⬆️ Uploading recording...');

    // Convert blob to dataURL for sending to background
    const reader = new FileReader();
    reader.onloadend = async () => {
      const response = await sendToBackground({
        type: 'SAVE_RECORDING',
        blob: reader.result,
        tabUrl: window.location.href,
      });
      if (response?.ok) {
        setStatus(`✅ Recording saved!`, 3000);
      } else {
        setStatus(`❌ Upload failed`, 4000);
      }
    };
    reader.readAsDataURL(blob);
  }

  // ─── DOM Extraction ──────────────────────────────────────────────────────

  function extractDOM() {
    const elements = [];
    const traverse = (node, depth = 0) => {
      if (depth > 8 || elements.length > 500) return;
      if (node.nodeType !== 1) return;

      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'path'].includes(tag)) return;

      const cs = window.getComputedStyle(node);
      elements.push({
        tag,
        id: node.id || undefined,
        classes: node.className && typeof node.className === 'string'
          ? node.className.split(' ').filter(Boolean).slice(0, 5)
          : undefined,
        text: node.childNodes.length === 1 && node.firstChild?.nodeType === 3
          ? node.textContent?.trim().slice(0, 80) || undefined
          : undefined,
        role: node.getAttribute('aria-role') || node.getAttribute('role') || undefined,
        href: node.getAttribute('href') || undefined,
        style: {
          display: cs.display,
          position: cs.position,
          width: cs.width,
          height: cs.height,
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          fontSize: cs.fontSize,
        },
        depth,
      });

      Array.from(node.children).forEach((child) => traverse(child, depth + 1));
    };

    traverse(document.body);

    return {
      url: window.location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      elementCount: elements.length,
      elements,
      meta: {
        description: document.querySelector('meta[name="description"]')?.content,
        keywords: document.querySelector('meta[name="keywords"]')?.content,
        ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      },
      capturedAt: new Date().toISOString(),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  let statusTimeout = null;
  function setStatus(msg, autoClearMs = 0) {
    const el = document.getElementById('bb-status');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      if (statusTimeout) clearTimeout(statusTimeout);
      if (autoClearMs) {
        statusTimeout = setTimeout(() => {
          el.textContent = '';
          el.style.display = 'none';
        }, autoClearMs);
      }
    }
    if (!panelOpen) {
      panel.classList.remove('bb-hidden');
      panelOpen = true;
    }
  }

  function sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
  }
})();
