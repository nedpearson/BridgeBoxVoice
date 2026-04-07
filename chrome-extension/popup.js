/**
 * Bridgebox Voice Capture — Popup Script
 * Loads user state from storage, renders captures, wires action buttons.
 */

// ─── One-shot hot-reload bootstrap ───────────────────────────────────────────
// Chrome reads popup.js fresh from disk every time the popup opens.
// On first open after a code update, we reload the extension so background.js
// picks up the latest code (including the WebSocket hot-reload client).
// After that single reload, all file changes auto-reload the extension forever.
chrome.storage.local.get(['_bb_boot_v2'], (r) => {
  if (!r._bb_boot_v2) {
    chrome.storage.local.set({ _bb_boot_v2: true }, () => chrome.runtime.reload());
    return; // Extension is reloading — popup will close
  }
});

// ─── Production config (seeded automatically) ────────────────────────────────
const SUPABASE_URL     = 'https://xuplmlfnhdtkqwbgplop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1cGxtbGZuaGR0a3F3YmdwbG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzc4MzcsImV4cCI6MjA5MDE1MzgzN30.TPfQvOeDKGeSiqLszqYP2agnBQUHUSuVaa5hq2yUayA';

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

  // Auto-seed storage with production Supabase config if not yet set
  const existing = await getStoredConfig();
  if (!existing.supabase_url) {
    await chrome.runtime.sendMessage({
      type: 'SET_CONFIG',
      supabase_url: SUPABASE_URL,
      supabase_anon_key: SUPABASE_ANON_KEY,
      user_token: existing.user_token || '',
    });
  }

  const config = await getStoredConfig();

  if (!config.supabase_url || !config.supabase_anon_key) {
    document.getElementById('not-connected').style.display = 'block';
    document.getElementById('status-dot').classList.remove('online');
  } else {
    document.getElementById('not-connected').style.display = 'none';
    document.getElementById('status-dot').classList.add('online');
    await loadProjects(config);
  }

  await loadCaptures();
  wireButtons();
});


// ─── Config ───────────────────────────────────────────────────────────────────

function getStoredConfig() {
  return new Promise((resolve) =>
    chrome.storage.local.get(
      ['supabase_url', 'supabase_anon_key', 'user_token', 'projects'],
      resolve
    )
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

async function loadProjects(config) {
  const sel = document.getElementById('project-select');
  const storedProjects = await new Promise((r) =>
    chrome.storage.local.get(['projects'], (res) => r(res.projects || []))
  );

  // Try to fetch fresh from Supabase
  try {
    const res = await fetch(`${config.supabase_url}/rest/v1/projects?select=id,name&order=created_at.desc&limit=20`, {
      headers: {
        apikey: config.supabase_anon_key,
        Authorization: `Bearer ${config.user_token || config.supabase_anon_key}`,
      },
    });
    if (res.ok) {
      const projects = await res.json();
      chrome.storage.local.set({ projects });
      populateProjectSelect(sel, projects);
      return;
    }
  } catch (_) {}

  populateProjectSelect(sel, storedProjects);
}

function populateProjectSelect(sel, projects) {
  projects.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

  // Restore last selection
  chrome.storage.local.get(['selected_project'], ({ selected_project }) => {
    if (selected_project) sel.value = selected_project;
  });

  sel.addEventListener('change', () => {
    chrome.storage.local.set({ selected_project: sel.value });
  });
}

// ─── Captures ─────────────────────────────────────────────────────────────────

async function loadCaptures() {
  const list = document.getElementById('captures-list');
  const response = await sendToBackground({ type: 'GET_CAPTURES' });
  const captures = response?.captures || [];

  list.innerHTML = '';

  if (!captures.length) {
    list.innerHTML = '<div class="empty-state">No captures yet. Take a screenshot or record your screen.</div>';
    return;
  }

  captures.slice().reverse().slice(0, 10).forEach((c) => {
    const item = document.createElement('div');
    item.className = 'capture-item';

    const icon = c.type === 'screenshot' ? '📸' : c.type === 'recording' ? '🎬' : '🌳';
    const name = c.fileName || `${c.type}-capture`;
    const time = new Date(c.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    item.innerHTML = `
      <span class="cap-icon">${icon}</span>
      <div class="cap-info">
        <div class="cap-name">${name}</div>
        <div class="cap-time">${time}</div>
      </div>
      ${c.url ? `<a class="cap-view" href="${c.url}" target="_blank">View</a>` : ''}
    `;

    // Click to preview screenshot locally
    if (c.dataUrl && c.type === 'screenshot') {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const win = window.open();
        win.document.write(`<img src="${c.dataUrl}" style="max-width:100%">`);
      });
    }

    list.appendChild(item);
  });
}

// ─── Wire Buttons ─────────────────────────────────────────────────────────────

function wireButtons() {
  // Screenshot
  document.getElementById('btn-screenshot').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById('bb-screenshot-btn')?.click(),
    });
    window.close();
  });

  // Record
  document.getElementById('btn-record').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById('bb-record-btn')?.click(),
    });
    window.close();
  });

  // DOM extraction
  document.getElementById('btn-dom').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById('bb-dom-btn')?.click(),
    });
    window.close();
  });

  // Sidebar
  document.getElementById('btn-sidebar').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  });

  // Setup link
  document.getElementById('setup-link').addEventListener('click', () => {
    chrome.tabs.create({ url: `${PLATFORM_URL}/settings?tab=extension` });
    window.close();
  });

  // Open platform
  document.getElementById('open-platform').addEventListener('click', () => {
    chrome.tabs.create({ url: PLATFORM_URL });
    window.close();
  });

  // Settings
  document.getElementById('settings-link').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') + '?settings=true' });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendToBackground(message) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response);
    })
  );
}
