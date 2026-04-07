# Bridgebox Voice Capture — Chrome Extension

A Manifest V3 Chrome Extension that lets you capture screenshots, screen recordings, DOM snapshots, and network data from any website — and instantly upload them to Bridgebox Voice for AI-powered app generation.

---

## 📦 Files

| File | Description |
|---|---|
| `manifest.json` | Manifest V3 — permissions, content scripts, side panel |
| `background.js` | Service worker — screenshot, recording, Supabase upload |
| `content.js` | Injected into every page — floating capture button, DOM extractor |
| `floating-button.css` | Styles for the floating FAB and action panel |
| `popup.html` / `popup.js` | Extension popup — quick capture + recent captures list |
| `sidebar.html` / `sidebar.js` | Chrome 114+ side panel — My Apps, Captures, AI Analyze tabs |

---

## 🚀 Installation (Development)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load Unpacked**
4. Select the `chrome-extension/` folder from this repo
5. The Bridgebox Voice icon will appear in your extensions bar

---

## ⚙️ Configuration

The extension needs your Supabase project details to upload captures.

**Option A — Via the Bridgebox Voice Platform** (recommended)  
Sign in at `app.bridgebox.ai → Settings → Chrome Extension` — the platform will auto-configure the extension.

**Option B — Manual**  
Open the extension popup → Settings → paste your Supabase URL and Anon Key.

### Environment Variables (stored in `chrome.storage.local`)

| Key | Value |
|---|---|
| `supabase_url` | Your Supabase project URL |
| `supabase_anon_key` | Your Supabase anon key |
| `user_token` | Your Supabase JWT (set on login) |

---

## 🎯 Features

### Floating Button
- Injected into **every web page** (bottom-right)
- Click to open the action panel
- Actions: Screenshot, Record Screen, Extract DOM, Network Snapshot, Open Sidebar

### Screenshot
- Uses `chrome.tabs.captureVisibleTab` for instant screenshots
- Auto-uploaded to Supabase Storage → `captures/` bucket
- Falls back to local storage (last 20) if Supabase not configured

### Screen Recording
- Uses `chrome.desktopCapture.chooseDesktopMedia` to pick screen/window/tab
- Records via `MediaRecorder` in WebM/VP9 format
- Shows a persistent recording indicator while active
- Uploads on stop

### DOM Extraction
- Traverses up to 8 levels deep, max 500 elements
- Captures: tag, id, classes, text, role, href, computed styles
- Exports as structured JSON

### Network Snapshot
- Uses `performance.getEntriesByType('resource')`
- Captures: URL, type, duration, transfer size, status

### Side Panel (Chrome 114+)
- Persistent panel — stays open while browsing
- **My Apps** tab: lists your deployed Bridgebox Voice projects
- **Captures** tab: recent capture history
- **AI Analyze** tab: analyze current page structure with AI

---

## 🛡️ Permissions Explained

| Permission | Reason |
|---|---|
| `activeTab` | Access current tab URL and content |
| `tabs` | Capture screenshots with `captureVisibleTab` |
| `storage` | Store Supabase config and local captures |
| `desktopCapture` | Show screen/window picker for recording |
| `scripting` | Inject content scripts dynamically |
| `sidePanel` | Open the Chrome side panel |
| `<all_urls>` | Inject the floating button on any website |

---

## 🔒 Data Privacy

- **No data is sent to third parties.** All captures go directly to YOUR Supabase project.
- Local fallback stores max 20 captures in Chrome's local storage (~5MB limit)
- No analytics, no tracking

---

## 📋 Supabase Storage Setup

Create a public bucket named `captures` in your Supabase project:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('captures', 'captures', true);

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'captures');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'captures');
```
