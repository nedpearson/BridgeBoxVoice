/**
 * Bridgebox Voice Capture — Sidebar Script (Chrome 114+ Side Panel)
 */

const PLATFORM_URL = 'https://app.bridgebox.ai';

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentTabInfo();
  await loadApps();
  await loadCaptures();
  wireTabs();
  wireActions();
});

// ─── Tab Info ─────────────────────────────────────────────────────────────────

async function loadCurrentTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      document.getElementById('domain-label').textContent = new URL(tab.url).hostname;
      document.getElementById('current-url').textContent = tab.url;
      document.getElementById('current-title').textContent = tab.title || '—';
      document.getElementById('current-meta').textContent =
        `${tab.width}×${tab.height}px · ${tab.id}`;
    }
  } catch (_) {}
}

// ─── Apps ─────────────────────────────────────────────────────────────────────

async function loadApps() {
  const list = document.getElementById('apps-list');
  const config = await getConfig();
  let projects = [];

  if (config.supabase_url && config.supabase_anon_key) {
    try {
      const res = await fetch(
        `${config.supabase_url}/rest/v1/projects?select=id,name,status,web_app_url&order=updated_at.desc&limit=10`,
        {
          headers: {
            apikey: config.supabase_anon_key,
            Authorization: `Bearer ${config.user_token || config.supabase_anon_key}`,
          },
        }
      );
      if (res.ok) projects = await res.json();
    } catch (_) {}
  }

  // Fallback: local mock projects
  if (!projects.length) {
    projects = [
      { id: 'demo', name: 'Dog Grooming Pro', status: 'deployed', web_app_url: 'https://example.vercel.app' },
      { id: 'demo2', name: 'Law Firm Portal', status: 'building', web_app_url: null },
    ];
  }

  list.innerHTML = '';
  if (!projects.length) {
    list.innerHTML = '<div class="empty-state">No apps yet. Create your first project in BridgeBox.</div>';
    return;
  }

  projects.forEach((p) => {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = p.web_app_url ? p.web_app_url : `${PLATFORM_URL}/project/${p.id}`;
    card.target = '_blank';
    const statusClass =
      p.status === 'deployed' ? 'status-live' :
      p.status === 'building' ? 'status-building' : 'status-draft';
    const statusLabel =
      p.status === 'deployed' ? '● Live' :
      p.status === 'building' ? '⟳ Building' : '◌ Draft';
    card.innerHTML = `
      <div class="app-name">${p.name}</div>
      ${p.web_app_url ? `<div class="app-meta">${p.web_app_url}</div>` : ''}
      <span class="app-status ${statusClass}">${statusLabel}</span>
    `;
    list.appendChild(card);
  });
}

// ─── Captures ─────────────────────────────────────────────────────────────────

async function loadCaptures() {
  const list = document.getElementById('captures-list');
  const response = await sendToBackground({ type: 'GET_CAPTURES' });
  const captures = response?.captures || [];

  list.innerHTML = '';
  if (!captures.length) {
    list.innerHTML = '<div class="empty-state">No captures yet on this device.</div>';
    return;
  }

  captures.slice().reverse().slice(0, 15).forEach((c) => {
    const item = document.createElement('div');
    item.className = 'capture-item';
    const icon = c.type === 'screenshot' ? '📸' : c.type === 'recording' ? '🎬' : '🌳';
    const time = new Date(c.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <span class="cap-icon">${icon}</span>
      <div class="cap-info">
        <div class="cap-name">${c.fileName || c.type}</div>
        <div class="cap-time">${time}</div>
      </div>
      <button class="cap-analyze" data-id="${c.id}">Analyze</button>
    `;
    item.querySelector('.cap-analyze').addEventListener('click', () => analyzeCapture(c));
    list.appendChild(item);
  });
}

// ─── AI Analyze ──────────────────────────────────────────────────────────────

document.getElementById('analyze-page-btn').addEventListener('click', analyzeCurrentPage);

async function analyzeCurrentPage() {
  const btn = document.getElementById('analyze-page-btn');
  btn.textContent = '⏳ Analyzing...';
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageSummary,
    });

    const summary = results?.[0]?.result;
    if (summary) {
      showAnalysisResult(`
        📊 <strong>Page Analysis: ${tab.title}</strong><br><br>
        🔗 Domain: ${new URL(tab.url).hostname}<br>
        📐 Layout: ${summary.layout}<br>
        🎨 Primary colors: ${summary.colors.join(', ')}<br>
        🧩 Components detected: ${summary.components.join(', ')}<br>
        📝 Text content: ${summary.textLength} chars<br>
        🖼 Images: ${summary.imageCount}<br>
        📋 Forms: ${summary.formCount}<br><br>
        💡 <em>Bridgebox Voice can build a similar application based on this structure.</em>
      `);
    }
  } catch (err) {
    showAnalysisResult(`❌ Could not analyze page: ${err.message}`);
  }

  btn.textContent = '✨ Analyze This Page';
  btn.disabled = false;
}

function extractPageSummary() {
  const colors = [];
  document.querySelectorAll('[style]').forEach((el) => {
    const bg = el.style.backgroundColor;
    if (bg && bg !== 'transparent' && !colors.includes(bg)) colors.push(bg);
  });

  const components = [];
  if (document.querySelector('nav')) components.push('Navigation');
  if (document.querySelector('table')) components.push('Data Table');
  if (document.querySelector('form')) components.push('Form');
  if (document.querySelector('canvas')) components.push('Chart/Canvas');
  if (document.querySelector('[class*="modal"], [class*="dialog"]')) components.push('Modal');
  if (document.querySelector('[class*="sidebar"]')) components.push('Sidebar');
  if (document.querySelector('[class*="card"]')) components.push('Cards');

  const isFlexGrid = document.querySelector('[style*="display: flex"], [style*="display:flex"], [style*="grid"]');

  return {
    layout: isFlexGrid ? 'Flex/Grid based' : 'Block layout',
    colors: colors.slice(0, 4).map(c => c.replace(/rgba?\([^)]+\)/, '[color]')) || ['default'],
    components: components.length ? components : ['Basic HTML'],
    textLength: document.body.innerText?.length || 0,
    imageCount: document.querySelectorAll('img').length,
    formCount: document.querySelectorAll('form').length,
  };
}

function showAnalysisResult(html) {
  const result = document.getElementById('analyze-result');
  document.getElementById('analyze-text').innerHTML = html;
  result.style.display = 'block';
}

async function analyzeCapture(capture) {
  switchTab('analyze');
  showAnalysisResult(`📸 Analyzing ${capture.type} capture...<br><br>Upload to Bridgebox Voice platform to run full AI analysis with Claude.`);
}

document.getElementById('build-from-analysis').addEventListener('click', () => {
  chrome.tabs.create({ url: `${PLATFORM_URL}?source=sidebar-analyze` });
});

// ─── Tab System ──────────────────────────────────────────────────────────────

function wireTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.toggle('active', c.id === `tab-${tabId}`));
}

// ─── Action Buttons ──────────────────────────────────────────────────────────

function wireActions() {
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await loadCurrentTabInfo();
    await loadApps();
    await loadCaptures();
  });

  document.getElementById('open-platform-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: PLATFORM_URL });
  });

  document.getElementById('sidebar-screenshot').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await sendToBackground({ type: 'SCREENSHOT', tabId: tab.id });
    if (result?.ok) {
      await loadCaptures();
      switchTab('captures');
    }
  });

  document.getElementById('sidebar-record').addEventListener('click', async () => {
    await sendToBackground({ type: 'START_RECORDING' });
  });

  document.getElementById('sidebar-new-project').addEventListener('click', () => {
    chrome.tabs.create({ url: `${PLATFORM_URL}/` });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfig() {
  return new Promise((resolve) =>
    chrome.storage.local.get(['supabase_url', 'supabase_anon_key', 'user_token'], resolve)
  );
}

function sendToBackground(message) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response);
    })
  );
}
