import { supabase } from './supabase'

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'
const OPENAI_MODEL = 'gpt-4o'

export interface AIAnalysis {
  businessType: string
  industry: string
  features: string[]
  integrations: string[]
  dataModels: Array<{ name: string; fields: string[] }>
  userRoles: string[]
  deploymentTargets: string[]
  clarifyingQuestions: string[]
  summary: string
  confidence: number
}

export interface ClarifyMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: ClarifyMessage[] = [],
  maxTokens = 4096,
  imageUrl?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: {
        model: CLAUDE_MODEL,
        systemPrompt,
        userMessage,
        history,
        maxTokens,
        imageUrl
      }
    })

    if (error) throw new Error(error.message || 'Unknown Edge Function Error')
    if (data?.error) throw new Error(data.error)

    return data?.content ?? ''
  } catch (e: any) {
    console.warn('Claude API failed (token/rate limit or error). Falling back to OpenAI chat gpt...', e)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-fallback'))
      import('posthog-js').then(({ default: posthog }) => {
        posthog.capture('llm-fallback-triggered', {
          original_model: CLAUDE_MODEL,
          fallback_model: OPENAI_MODEL,
          error_message: e.message,
        })
      }).catch(() => { })
    }

    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: {
        model: OPENAI_MODEL,
        systemPrompt,
        userMessage,
        history,
        maxTokens,
        imageUrl
      }
    })

    if (error) throw new Error(error.message || 'Unknown Edge Function Error')
    if (data?.error) throw new Error(data.error)

    return data?.content ?? ''
  }
}

// ─── Intent Extraction ────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an expert software architect who converts voice descriptions of business software into structured specifications.

Given a voice transcript of someone describing the software application they want built, extract:
- businessType: what type of business this is for
- industry: the industry vertical (e.g. "Law", "Healthcare", "Retail", "Finance")
- features: list of specific features to build (5-15 items)
- integrations: third-party services to integrate (e.g. "Stripe", "QuickBooks", "Salesforce")
- dataModels: key data entities with their fields
- userRoles: the different types of users in the system
- deploymentTargets: platforms to deploy to ("web", "ios", "android", "windows", "mac")
- clarifyingQuestions: 3-5 follow-up questions to clarify ambiguities
- summary: a 2-3 sentence executive summary of the software
- confidence: your overall confidence in the extraction (0-1)

Respond ONLY with valid JSON in this exact structure. No markdown, no explanation.`

export async function extractIntent(transcript: string): Promise<AIAnalysis> {
  const raw = await callClaude(EXTRACTION_SYSTEM, `Voice transcript:\n\n${transcript}`)
  return JSON.parse(raw) as AIAnalysis
}

// ─── Clarifying Q&A ───────────────────────────────────────────────────────────

const CLARIFY_SYSTEM = `You are an expert software architect helping refine requirements for a custom business software project.
The user has described their software via voice, and you are helping clarify requirements through follow-up questions.
Be concise, professional, and focused on extracting information that will improve the software specification.
Ask one focused question at a time. Keep responses under 150 words.`

export async function askClarifying(
  question: string,
  history: ClarifyMessage[],
  analysis: AIAnalysis
): Promise<string> {
  const context = `Original software analysis:\n${JSON.stringify(analysis, null, 2)}\n\nUser's response: ${question}`
  return callClaude(CLARIFY_SYSTEM, context, history)
}

// ─── Spec Generation ──────────────────────────────────────────────────────────

const SPEC_SYSTEM = `You are a senior software architect and product lead. Your job is to generate an EXHAUSTIVE, production-grade technical specification for a custom business application.

Given the business analysis, you must produce a spec that covers EVERY corner of the application. Do NOT be generic — use the exact business type, industry terminology, and real-world workflows from the analysis.

Return JSON with these fields:
- title: specific project title (e.g. "Maison Élite Boutique Management Suite" not "Retail App")
- description: 3-5 sentence description using real domain language
- eleganceLevel: "luxury" | "professional" | "functional" — set based on industry (boutique/spa/hotel = luxury)
- colorTheme: suggested color palette description (e.g. "Deep charcoal, champagne gold accents, ivory text — luxury boutique aesthetic")
- techStack: { frontend, backend, database, hosting }
- features: AT LEAST 20 detailed features with { name, description, priority, complexity }. Cover: CRUD operations, reporting/analytics, customer management, staff management, inventory/scheduling, billing/payments, notifications, search/filters, export, settings, integrations, mobile responsiveness
- dataModels: AT LEAST 8 entities with { name, fields: [{ name, type, required }][] }. Use domain-specific field names.
- uiScreens: AT LEAST 10 screens with { name, description, components: string[] }. Every screen must have 5+ components listed.
- workflows: key business workflows as step-by-step arrays (e.g. ["Customer books appointment" → "Staff gets notified" → "Service completed" → "Invoice generated" → "Follow-up sent"])
- mockData: realistic example records for each data model (3-5 records each, using real-sounding names/values for the industry)

Respond ONLY with valid JSON. Be extremely specific and detailed.`

export async function generateSpec(analysis: AIAnalysis): Promise<Record<string, unknown>> {
  const raw = await callClaude(SPEC_SYSTEM, JSON.stringify(analysis, null, 2), [], 8192)
  return JSON.parse(raw) as Record<string, unknown>
}

// ─── Prompt Enhancement ───────────────────────────────────────────────────────

const ENHANCE_SYSTEM = `You are an expert product manager and software architect. A user has provided a rough draft or voice transcript of an application they want to build.
Your task is to rewrite it into a clear, comprehensive, and professional software requirement description that fully captures their intent.
Expand on implicit requirements, organize it logically, use clear terminology, and ensure it's easily actionable by a development team.
Do NOT just summarize; build upon their idea to make it a robust software description.
Respond ONLY with the rewritten description. Do not add any conversational filler like "Here is the rewritten description:".`

export async function enhancePrompt(roughPrompt: string): Promise<string> {
  return await callClaude(ENHANCE_SYSTEM, `Original prompt:\n\n${roughPrompt}`)
}

// ─── App Preview Generation ────────────────────────────────────────────────────

export const hasAnthropicKey = true // Handled by edge function now

const PREVIEW_SYSTEM = `You are a senior full-stack engineer. Build a COMPLETE, production-grade SPA as ONE self-contained HTML file.

CRITICAL: Use the DATA-DRIVEN ARCHITECTURE below. This lets you build 12+ fully functional sections efficiently.

══════════════════════════════════════════════════════
STEP 1 — PASTE THIS EXACT ENGINE (do not modify)
══════════════════════════════════════════════════════
<script>
// ── Data Engine ──────────────────────────────────────
const DB={get:(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),init:(k,d)=>{if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(d));return JSON.parse(localStorage.getItem(k))}};
const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);

// ── Navigation ───────────────────────────────────────
let currentSection='dashboard';
function nav(id){
  document.querySelectorAll('.sec').forEach(s=>s.style.display='none');
  const el=document.getElementById('s-'+id);if(el)el.style.display='block';
  document.querySelectorAll('.nl').forEach(l=>l.classList.remove('active'));
  const lk=document.querySelector('[data-s="'+id+'"]');
  if(lk){lk.classList.add('active');const t=document.getElementById('pt');if(t)t.textContent=lk.dataset.label||id;}
  currentSection=id;
  if(window['r_'+id])window['r_'+id]();
}

// ── Modal ────────────────────────────────────────────
function openM(id){const m=document.getElementById(id);if(m){m.style.display='flex';}}
function closeM(id){const m=document.getElementById(id);if(m)m.style.display='none';}

// ── Toast ────────────────────────────────────────────
function toast(msg,err){const t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;bottom:24px;right:24px;padding:13px 20px;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;'+(err?'background:#DC2626;color:#fff;':'background:var(--a);color:#0D0D0D;');document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}

// ── Generic CRUD Table Renderer ──────────────────────
// cfg: { entity, tbodyId, columns:[{key,label,render?}], searchId, formId, detailPanelId }
function renderTable(cfg){
  const rows=DB.get('d_'+cfg.entity)||[];
  const q=(document.getElementById(cfg.searchId)?.value||'').toLowerCase();
  const filtered=q?rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(q)):rows;
  document.getElementById(cfg.tbodyId).innerHTML=filtered.map(row=>\`
    <tr onclick="openDetail('\${cfg.entity}','\${row.id}')" style="cursor:pointer" class="tr-row">
      \${cfg.columns.map(c=>\`<td>\${c.render?c.render(row[c.key],row):row[c.key]||''}</td>\`).join('')}
      <td><button class="bsm" onclick="event.stopPropagation();editRow('\${cfg.entity}','\${row.id}',\${JSON.stringify(cfg).replace(/'/g,"\\\\'")})" >Edit</button>
          <button class="bsm bdanger" onclick="event.stopPropagation();delRow('\${cfg.entity}','\${row.id}')">Del</button></td>
    </tr>\`).join('')||'<tr><td colspan="99" style="text-align:center;padding:32px;opacity:0.4">No records found</td></tr>';
}

// ── Detail Panel ─────────────────────────────────────
function openDetail(entity,id){
  const row=(DB.get('d_'+entity)||[]).find(r=>r.id===id);if(!row)return;
  const panel=document.getElementById('detail-panel');
  const labels=window['labels_'+entity]||{};
  panel.innerHTML=\`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-family:var(--ff-head,inherit);color:var(--a)">\${row[Object.keys(row)[1]]||'Detail'}</h3><button onclick="document.getElementById('detail-panel').style.display='none'" style="background:none;border:none;color:var(--tm);font-size:20px;cursor:pointer">✕</button></div>
    \${Object.entries(row).filter(([k])=>k!=='id').map(([k,v])=>\`<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tm);margin-bottom:4px">\${labels[k]||k.replace(/_/g,' ')}</div><div style="font-size:14px;color:var(--text)">\${v||'—'}</div></div>\`).join('')}
    <div style="margin-top:20px;display:flex;gap:8px"><button class="btn" onclick="editRow('\${entity}','\${id}')">Edit</button><button class="btn bdanger" onclick="delRow('\${entity}','\${id}');document.getElementById('detail-panel').style.display='none'">Delete</button></div>\`;
  panel.style.display='block';
}

// ── Delete ───────────────────────────────────────────
function delRow(entity,id){
  if(!confirm('Delete this record?'))return;
  DB.set('d_'+entity,(DB.get('d_'+entity)||[]).filter(r=>r.id!==id));
  toast('Deleted');if(window['r_'+currentSection])window['r_'+currentSection]();
}

// ── Edit (populate form) ─────────────────────────────
function editRow(entity,id){
  const row=(DB.get('d_'+entity)||[]).find(r=>r.id===id);if(!row)return;
  const form=document.getElementById('form-'+entity);if(!form)return;
  form.dataset.editId=id;
  Object.entries(row).forEach(([k,v])=>{const el=form.elements[k];if(el)el.value=v;});
  const title=form.closest('.modal-box')?.querySelector('h3');
  if(title)title.textContent='Edit '+entity.replace(/_/g,' ');
  openM('modal-'+entity);
}

// ── Save (create or update) ──────────────────────────
function saveRow(e,entity,fields){
  e.preventDefault();
  const form=e.target;const editId=form.dataset.editId;
  const rows=DB.get('d_'+entity)||[];
  const obj={id:editId||genId()};
  fields.forEach(f=>{obj[f]=form.elements[f]?.value||'';});
  if(editId){const i=rows.findIndex(r=>r.id===editId);if(i>-1)rows[i]={...rows[i],...obj};}
  else{obj.created=new Date().toLocaleDateString();rows.push(obj);}
  DB.set('d_'+entity,rows);form.dataset.editId='';form.reset();
  closeM('modal-'+entity);toast(editId?'Updated!':'Added!');
  if(window['r_'+currentSection])window['r_'+currentSection]();
}

// ── Search wire-up ───────────────────────────────────
function wireSearch(searchId,renderFn){
  const el=document.getElementById(searchId);
  if(el)el.addEventListener('input',renderFn);
}
</script>

══════════════════════════════════════════════════════
STEP 2 — DESIGN SYSTEM (apply based on spec.eleganceLevel)
══════════════════════════════════════════════════════
FOR luxury (boutique/spa/bridal/hotel): Use this CSS:
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
:root{--bg:#0D0C0A;--sb:#131009;--a:#C9A84C;--text:#F0EAD6;--tm:#8A7D65;--border:rgba(201,168,76,0.18);--card:#1A1710;--ff-head:'Cormorant Garamond',serif;}
.logo{font-family:var(--ff-head);font-style:italic;font-size:22px;color:var(--a);padding:24px 20px 12px;}
.btn{padding:9px 18px;border:1px solid var(--a);color:var(--a);background:transparent;border-radius:7px;cursor:pointer;font-size:13px;transition:.15s;}
.btn:hover{background:var(--a);color:#0D0D0D;}.btn.btn-primary{background:var(--a);color:#0D0D0D;}
.bdanger{border-color:#DC2626!important;color:#DC2626!important;}
.bdanger:hover{background:#DC2626!important;color:#fff!important;}

FOR professional: :root{--bg:#08101E;--sb:#0D1828;--a:#3B82F6;--text:#F1F5F9;--tm:#64748B;--border:#1E293B;--card:#0F1E30;}
FOR functional: :root{--bg:#0F1117;--sb:#161B25;--a:#10B981;--text:#F9FAFB;--tm:#6B7280;--border:#1F2937;--card:#1A2030;}

UNIVERSAL CSS (always include):
body{margin:0;background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;}
#sidebar{width:240px;height:100vh;position:fixed;left:0;top:0;background:var(--sb);border-right:1px solid var(--border);overflow-y:auto;z-index:100;}
#header{position:fixed;top:0;left:240px;right:0;height:58px;background:var(--sb);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 28px;z-index:99;gap:12px;}
#main{margin-left:240px;padding:80px 32px 40px;min-height:100vh;}
.sec{display:none;}.nl{display:block;padding:9px 18px;color:var(--tm);text-decoration:none;font-size:13px;letter-spacing:.05em;border-left:3px solid transparent;transition:.15s;}
.nl:hover{background:rgba(255,255,255,.04);color:var(--text);}.nl.active{background:rgba(201,168,76,.1);color:var(--a);border-left-color:var(--a);}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:22px;}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 22px;}
.stat-val{font-size:30px;font-weight:700;color:var(--text);}.stat-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tm);margin-bottom:6px;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--tm);padding:10px 14px;text-align:left;border-bottom:1px solid var(--border);}
.tbl td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px;vertical-align:middle;}
.tr-row:hover td{background:rgba(255,255,255,.025);}
.bsm{padding:4px 10px;font-size:11px;border-radius:5px;cursor:pointer;border:1px solid var(--border);color:var(--tm);background:transparent;margin-right:4px;}
.bsm:hover{border-color:var(--a);color:var(--a);}
.srch{padding:8px 13px;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;width:240px;}
.srch:focus{outline:none;border-color:var(--a);}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.fg{margin-bottom:15px;}.fg label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--tm);margin-bottom:5px;}
.fc{width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;font-family:inherit;box-sizing:border-box;}
.fc:focus{outline:none;border-color:var(--a);}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;}
.modal-box{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px;width:500px;max-width:90vw;max-height:85vh;overflow-y:auto;}
#detail-panel{position:fixed;right:0;top:0;height:100vh;width:360px;background:var(--card);border-left:1px solid var(--border);padding:24px;overflow-y:auto;z-index:200;display:none;box-shadow:-8px 0 40px rgba(0,0,0,.35);}
.badge{display:inline-flex;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:600;}
.b-green{background:rgba(16,185,129,.15);color:#10B981;}.b-amber{background:rgba(245,158,11,.15);color:#F59E0B;}.b-red{background:rgba(220,38,38,.15);color:#EF4444;}.b-blue{background:rgba(59,130,246,.15);color:#3B82F6;}
.nav-section{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--tm);padding:16px 18px 4px;font-weight:600;}

══════════════════════════════════════════════════════
STEP 3 — BUILD ALL SECTIONS USING THIS EXACT PATTERN
══════════════════════════════════════════════════════
For EACH section in spec.uiScreens, follow this pattern:

HTML SECTION (inside <body>):
<div id="s-{sectionKey}" class="sec">
  <div class="sh">
    <h2 style="margin:0;font-size:20px">{Section Name}</h2>
    <div style="display:flex;gap:8px;align-items:center">
      <input class="srch" id="srch-{entity}" placeholder="Search..." oninput="r_{sectionKey}()">
      <button class="btn btn-primary" onclick="document.getElementById('form-{entity}').dataset.editId='';document.getElementById('form-{entity}').reset();openM('modal-{entity}')">+ Add New</button>
    </div>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table class="tbl"><thead><tr>
      <th>Column 1</th><th>Column 2</th>...<th>Actions</th>
    </tr></thead><tbody id="tb-{entity}"></tbody></table>
  </div>
</div>

MODAL (for add/edit):
<div id="modal-{entity}" class="modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center">
  <div class="modal-box">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px"><h3 style="margin:0">Add {Entity}</h3><button onclick="closeM('modal-{entity}')" style="background:none;border:none;color:var(--tm);font-size:18px;cursor:pointer">✕</button></div>
    <form id="form-{entity}" onsubmit="saveRow(event,'{entity}',['{field1}','{field2}',...])">
      <div class="fg"><label>Field 1</label><input class="fc" name="{field1}" required></div>
      <div class="fg"><label>Field 2</label><input class="fc" name="{field2}"></div>
      ... ALL important fields from spec.dataModels ...
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn" onclick="closeM('modal-{entity}')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  </div>
</div>

RENDER FUNCTION (in <script>):
window.r_{sectionKey}=function(){
  renderTable({entity:'{entity}',tbodyId:'tb-{entity}',searchId:'srch-{entity}',
    columns:[
      {key:'{field1}',label:'Label 1'},
      {key:'status',label:'Status',render:(v)=>\`<span class="badge \${v==='Active'?'b-green':v==='Pending'?'b-amber':'b-red'}">\${v}</span>\`},
      ...
    ]
  });
};

SEED DATA (in <script>, using spec.mockData):
DB.init('d_{entity}', [ ...use exact records from spec.mockData, expand to 10-12 rows with realistic domain data... ]);

══════════════════════════════════════════════════════
STEP 4 — DASHBOARD (build this section fully)
══════════════════════════════════════════════════════
Dashboard section must have:
- 4 stat cards counting live DB records: e.g. Today's Appointments, Total Customers, Pending Pickups, This Month's Revenue
- 1 Chart.js bar or line chart: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- Recent activity table showing last 5-8 records from key entity
- Quick action buttons that navigate to key sections

Update stat counts dynamically in each render function using:
function updateStats(){
  document.getElementById('stat-appts').textContent=(DB.get('d_appointments')||[]).length;
  ... etc ...
}

══════════════════════════════════════════════════════
STEP 5 — FINAL WIRING
══════════════════════════════════════════════════════
At the end of <script>:
1. Call DB.init for ALL entities with 10-12 realistic seed records each (use spec.mockData, expand with more domain-realistic rows)
2. Wire all search inputs: wireSearch('srch-{entity}', r_{section})
3. Call nav('dashboard') to start on dashboard
4. Initialize Chart.js chart

══════════════════════════════════════════════════════
ABSOLUTE RULES
══════════════════════════════════════════════════════
✗ NO placeholder sections — every section has a real table with real data
✗ NO "Coming soon" text anywhere
✗ NO <form action="..."> — all forms use onsubmit="saveRow(...)"
✗ NO external JS except Google Fonts + Chart.js CDN
✓ ALL 12+ sections from spec.uiScreens MUST be implemented
✓ ALL data from spec.mockData MUST be used as seed rows
✓ EVERY section: search works, add opens modal, edit populates form, delete confirms, row click opens detail panel
✓ Detail panel shows ALL fields for the record with labels from spec.dataModels
✓ The app must work completely offline (self-contained)

Return ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no fences, no explanation.`

export async function generateAppPreview(spec: Record<string, unknown>): Promise<string> {
  const specJson = JSON.stringify(spec, null, 2)
  const userMsg = `Build the COMPLETE, fully functional production application for this specification.
IMPLEMENT EVERY SECTION listed in uiScreens. Use the mockData for seed records, expand each entity to 10-12 rows.
Every section needs: working table, add modal, edit, delete, search, and row-click detail panel.
NO placeholders. NO empty sections. ALL buttons must work.

SPEC:
${specJson}`
  const raw = await callClaude(PREVIEW_SYSTEM, userMsg, [], 8192)
  return raw.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim()
}


// ─── Full Application Code Generation ─────────────────────────────────────────

const SKELETON_SYSTEM = `You are a senior full-stack engineer. Given a software specification, generate the SKELETON of a React + TypeScript app — just the router and shared state, NO page content yet.

Output a JSON object:
{
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/store/index.ts", "content": "..." }
  ],
  "pages": [
    { "path": "src/pages/Dashboard.tsx", "name": "Dashboard", "route": "/" },
    ...one entry per page...
  ],
  "readme": "..."
}

Rules:
- App.tsx MUST use BrowserRouter, Routes, Route from react-router-dom v6. Wrap all routes in a Layout component: import Layout from './components/Layout'. Use <Layout> as a wrapper with <Outlet /> pattern.
- App.tsx must import each page directly by file path (e.g. import Dashboard from './pages/Dashboard').
- src/store/index.ts MUST be completely self-contained. Define ALL TypeScript interfaces AND all mock data arrays inline in THIS SINGLE FILE. DO NOT import from '../types', '../data', or any other local file. The store file must have ZERO relative imports. Only import from 'zustand'.
- The store MUST use a named export: 'export const useStore = create<StoreState>(...)'. DO NOT use default export.
- Include at least 5 realistic mock data items per entity defined in the spec.
- We are using React Router v6. ONLY use useNavigate, NOT useHistory.
- Return ONLY valid JSON. No markdown. No explanation.`

const PAGE_SYSTEM = `You are a senior React engineer. Generate a SINGLE fully-featured React page component.

Output ONLY this JSON structure:
{
  "content": "...complete TypeScript React component as a single string..."
}

CRITICAL RULES — violating any of these will break the build:
1. The "content" value must be a complete, valid TypeScript React component. NO truncation, NO "..." placeholders.
2. Default export only. Component name must be a valid JS identifier (letters and numbers only — NO slashes, spaces, or special characters).
3. All mock data must be defined as simple const arrays at the TOP of the file, before the component function. Keep each data item simple: only string and number fields.
4. DO NOT import from any local file. Only allowed imports: 'react', 'react-router-dom', 'lucide-react'.
5. Use ONLY these lucide-react icons (no others exist): BarChart2, Bell, Box, Calendar, Check, CheckCircle, ChevronDown, ChevronRight, Clock, Cog, CreditCard, DollarSign, Edit2, Eye, FileText, Filter, Home, Info, List, Mail, MoreHorizontal, Package, Phone, Plus, PlusCircle, RefreshCw, Search, Settings, Star, Trash2, TrendingUp, User, UserCheck, UserPlus, Users, Wallet, X, XCircle.
6. Every JSX attribute must be complete: className="..." not className={...)} or className=.
7. Every opening JSX tag must have a matching close: <div> must end with </div> or />.
8. DO NOT use ternary expressions inside JSX attribute values — use a variable instead.
9. Keep the component under 200 lines total to avoid truncation.
10. Include at least one data table and one detail/modal view toggled with useState.
Return ONLY the JSON. No markdown code blocks. No explanation.`

export async function generateFullApplication(spec: Record<string, unknown>, projectName: string, retries = 2): Promise<{ files: { path: string, content: string }[], pages: { path: string, name: string, route: string }[], readme: string }> {
  const specJson = JSON.stringify(spec, null, 2)

  // ── Pass 1: Generate skeleton (App.tsx, store, types, data) ──────────────────
  let skeleton: { files: { path: string, content: string }[], pages: { path: string, name: string, route: string }[], readme: string }
  let skeletonAttempts = 0
  while (true) {
    try {
      const raw = await callClaude(SKELETON_SYSTEM, `Project Name: ${projectName}\n\nSpecification:\n${specJson}`, [], 4096)
      const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
      skeleton = JSON.parse(cleaned)
      break
    } catch (e: any) {
      if (skeletonAttempts >= retries) throw new Error(`Skeleton generation failed: ${e.message}`)
      skeletonAttempts++
    }
  }

  const allFiles: { path: string, content: string }[] = [...skeleton.files]

  // ── Pass 2: Generate each page individually in parallel ──────────────────────
  const pages = skeleton.pages || []
  const pageResults = await Promise.allSettled(
    pages.map(async (page) => {
      let pageAttempts = 0
      while (true) {
        try {
          const prompt = `Project: ${projectName}

Specification:
${specJson}

Generate the page component for: ${page.name} (route: ${page.route})
File path: ${page.path}

Other pages in the app: ${pages.map(p => p.name + ' at ' + p.route).join(', ')}.

Make this page FULLY featured with realistic inline mock data, interactions, drill-downs, and a beautiful dark UI. All data must be defined inline in this file using useState — do NOT import from any local files.`

          const raw = await callClaude(PAGE_SYSTEM, prompt, [], 8192)
          const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
          const parsed = JSON.parse(cleaned)
          return { path: page.path, content: parsed.content as string }
        } catch (e: any) {
          if (pageAttempts >= retries) {
            // Return a stub if this page fails repeatedly
            const name = page.name
            const safeName = name.replace(/[^a-zA-Z0-9]/g, '')
            return {
              path: page.path,
              content: `import React from 'react';\nexport default function ${safeName}() {\n  return <div className="p-8"><h1 className="text-2xl font-bold text-white">${name}</h1><p className="text-gray-400 mt-2">Coming soon.</p></div>;\n}`
            }
          }
          pageAttempts++
        }
      }
    })
  )

  for (const result of pageResults) {
    if (result.status === 'fulfilled') {
      allFiles.push(result.value)
    }
  }

  return { files: allFiles, pages: skeleton.pages || [], readme: skeleton.readme || '' }
}
