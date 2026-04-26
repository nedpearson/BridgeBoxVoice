// @ts-nocheck
/**
 * Bridgebox Voice Capture — Background Service Worker (Manifest V3)
 * Handles: screenshot capture, desktop recording, Supabase uploads, message routing
 */


// ─── Configuration ────────────────────────────────────────────────────────────

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';
let USER_TOKEN = '';

// Load config from storage on startup
chrome.storage.local.get(['supabase_url', 'supabase_anon_key', 'user_token'], (result) => {
  SUPABASE_URL = result.supabase_url || '';
  SUPABASE_ANON_KEY = result.supabase_anon_key || '';
  USER_TOKEN = result.user_token || '';
});

// ─── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCREENSHOT':
      takeScreenshot(sender.tab?.id).then(sendResponse);
      return true; // keep channel open for async

    case 'START_RECORDING':
      startDesktopRecording().then(sendResponse);
      return true;

    case 'STOP_RECORDING':
      // Handled in content.js — blob is sent back as SAVE_RECORDING
      sendResponse({ ok: true });
      break;

    case 'SAVE_RECORDING':
      saveRecordingToSupabase(message.blob, message.tabUrl, message.projectId)
        .then(sendResponse);
      return true;

    case 'SAVE_DOM_SNAPSHOT':
      saveDomSnapshot(message.snapshot, message.tabUrl, message.projectId)
        .then(sendResponse);
      return true;

    case 'GET_CAPTURES':
      getCaptures(message.projectId).then(sendResponse);
      return true;

    case 'SET_CONFIG':
      SUPABASE_URL = message.supabase_url;
      SUPABASE_ANON_KEY = message.supabase_anon_key;
      USER_TOKEN = message.user_token;
      chrome.storage.local.set({
        supabase_url: SUPABASE_URL,
        supabase_anon_key: SUPABASE_ANON_KEY,
        user_token: USER_TOKEN,
      });
      sendResponse({ ok: true });
      break;

    case 'OPEN_SIDEBAR':
      chrome.sidePanel.open({ tabId: sender.tab?.id }).catch(console.error);
      sendResponse({ ok: true });
      break;
  }
});

// ─── Screenshot ───────────────────────────────────────────────────────────────

async function takeScreenshot(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 95,
    });

    const blob = dataUrlToBlob(dataUrl);
    const fileName = `screenshot-${Date.now()}.png`;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // Store locally if not configured
      await saveToLocalStorage({ type: 'screenshot', dataUrl, fileName });
      return { ok: true, stored: 'local', fileName };
    }

    const url = await uploadToSupabase(blob, `captures/${fileName}`, 'image/png');
    await insertCaptureRecord({ type: 'screenshot', file_path: url, tabId });
    return { ok: true, stored: 'supabase', url, fileName };
  } catch (err) {
    console.error('[Bridgebox Voice] Screenshot failed:', err);
    return { ok: false, error: err.message };
  }
}

// ─── Desktop Recording ────────────────────────────────────────────────────────

let pendingRecordingResolver = null;

async function startDesktopRecording() {
  return new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      async (streamId) => {
        if (!streamId) {
          resolve({ ok: false, error: 'User cancelled selection' });
          return;
        }
        // Send stream ID to content script — it will handle MediaRecorder
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'START_RECORDING_WITH_STREAM',
              streamId,
            });
          }
        });
        resolve({ ok: true, streamId });
      }
    );
  });
}

// ─── Supabase Storage Upload ──────────────────────────────────────────────────

async function uploadToSupabase(blob, path, mimeType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/captures/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${USER_TOKEN || SUPABASE_ANON_KEY}`,
      'Content-Type': mimeType,
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Supabase upload failed: ${res.status}`);
  const data = await res.json();
  return `${SUPABASE_URL}/storage/v1/object/public/captures/${path}`;
}

async function insertCaptureRecord({ type, file_path, tabId }) {
  const tab = await chrome.tabs.get(tabId);
  await fetch(`${SUPABASE_URL}/rest/v1/captures`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${USER_TOKEN || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      type,
      file_path,
      url_captured: tab?.url,
      created_at: new Date().toISOString(),
    }),
  });
}

async function saveRecordingToSupabase(blobDataUrl, tabUrl, projectId) {
  try {
    const blob = dataUrlToBlob(blobDataUrl);
    const fileName = `recording-${Date.now()}.webm`;
    const url = await uploadToSupabase(blob, `captures/${fileName}`, 'video/webm');
    return { ok: true, url, fileName };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function saveDomSnapshot(snapshot, tabUrl, projectId) {
  try {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const fileName = `dom-${Date.now()}.json`;
    const url = await uploadToSupabase(blob, `captures/${fileName}`, 'application/json');
    return { ok: true, url, fileName };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Local Storage Fallback ───────────────────────────────────────────────────

async function saveToLocalStorage({ type, dataUrl, fileName }) {
  const existing = await new Promise((resolve) =>
    chrome.storage.local.get(['local_captures'], (r) => resolve(r.local_captures || []))
  );
  const entry = { id: Date.now(), type, dataUrl, fileName, capturedAt: new Date().toISOString() };
  existing.push(entry);
  // Keep only last 20 local captures to avoid exceeding 5MB storage limit
  const trimmed = existing.slice(-20);
  await new Promise((resolve) =>
    chrome.storage.local.set({ local_captures: trimmed }, resolve)
  );
  return entry;
}

async function getCaptures(projectId) {
  const local = await new Promise((resolve) =>
    chrome.storage.local.get(['local_captures'], (r) => resolve(r.local_captures || []))
  );
  return { ok: true, captures: local };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

// ─── Install / Update ─────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Bridgebox Voice] Extension installed:', details.reason);
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'popup.html?onboarding=true' });
  }
});

// ─── Dev Hot-Reload (auto-reconnects to local WebSocket server) ───────────────

/*
const HOT_RELOAD_PORT = 58371;

function connectHotReload() {
  try {
    const ws = new WebSocket(`ws://localhost:${HOT_RELOAD_PORT}`);
    ws.onopen    = () => console.log('[Bridgebox Voice] Hot-reload connected ✓');
    ws.onmessage = (e) => { if (e.data === 'reload') { console.log('[Bridgebox Voice] Reloading…'); chrome.runtime.reload(); } };
    ws.onclose   = () => setTimeout(connectHotReload, 2000); // retry on disconnect
    ws.onerror   = () => ws.close();
  } catch (_) {}
}

connectHotReload();
*/

