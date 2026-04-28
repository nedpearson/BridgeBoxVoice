const fs = require('fs');
let code = fs.readFileSync('src/lib/agents/pageTemplate.ts', 'utf8');

const themeSetup = `
export const THEMES = [
  { bg: 'bg-[#030712]', cardBg: 'bg-[#0B0F19]', navBg: 'bg-[#060913]', border: 'border-[#1E293B]', textNormal: 'text-slate-200', textMain: 'text-white', textSub: 'text-slate-500', textMuted: 'text-slate-400', inputBg: 'bg-[#131B2B]', hoverBg: 'hover:bg-[#1E293B]', accentBg: 'bg-blue-600', accentHover: 'hover:bg-blue-500', accentText: 'text-blue-400', shadow: 'shadow-blue-600/20' },
  { bg: 'bg-stone-50', cardBg: 'bg-white', navBg: 'bg-stone-100', border: 'border-stone-200', textNormal: 'text-stone-700', textMain: 'text-stone-900', textSub: 'text-stone-500', textMuted: 'text-stone-400', inputBg: 'bg-stone-50', hoverBg: 'hover:bg-stone-100', accentBg: 'bg-rose-600', accentHover: 'hover:bg-rose-500', accentText: 'text-rose-600', shadow: 'shadow-rose-600/20' },
  { bg: 'bg-zinc-50', cardBg: 'bg-white', navBg: 'bg-zinc-100', border: 'border-zinc-200', textNormal: 'text-zinc-700', textMain: 'text-zinc-900', textSub: 'text-zinc-500', textMuted: 'text-zinc-400', inputBg: 'bg-zinc-50', hoverBg: 'hover:bg-zinc-100', accentBg: 'bg-emerald-600', accentHover: 'hover:bg-emerald-500', accentText: 'text-emerald-600', shadow: 'shadow-emerald-600/20' },
  { bg: 'bg-slate-950', cardBg: 'bg-slate-900', navBg: 'bg-slate-950', border: 'border-slate-800', textNormal: 'text-slate-300', textMain: 'text-slate-50', textSub: 'text-slate-500', textMuted: 'text-slate-400', inputBg: 'bg-slate-800', hoverBg: 'hover:bg-slate-700', accentBg: 'bg-violet-600', accentHover: 'hover:bg-violet-500', accentText: 'text-violet-400', shadow: 'shadow-violet-600/20' }
];
export const getTheme = (name: string | undefined) => THEMES[(name || '').split('').reduce((a,b)=>a+b.charCodeAt(0),0) % THEMES.length];
`;

code = code.replace(/export function buildPageFromData\(pageName: string, _route: string, data: PageData\): string \{/,
  'export function buildPageFromData(pageName: string, _route: string, data: PageData, projectName?: string): string {\n  const T = getTheme(projectName);');

code = code.replace(/export function buildCalendarPage\(pageName: string, _route: string, data: PageData\): string \{/,
  'export function buildCalendarPage(pageName: string, _route: string, data: PageData, projectName?: string): string {\n  const T = getTheme(projectName);');

code = code.replace(/export const STATUS_MAP = \{\}/, themeSetup + '\nexport const STATUS_MAP = {}');

const reps = [
  ['bg-[#05080f]', '${T.bg}'],
  ['bg-[#030712]', '${T.bg}'],
  ['bg-[#0B0F19]', '${T.cardBg}'],
  ['bg-[#060913]', '${T.navBg}'],
  ['border-[#1E293B]', '${T.border}'],
  ['text-slate-200', '${T.textNormal}'],
  ['text-white', '${T.textMain}'],
  ['text-slate-500', '${T.textSub}'],
  ['text-slate-400', '${T.textMuted}'],
  ['bg-[#131B2B]', '${T.inputBg}'],
  ['hover:bg-[#1E293B]', '${T.hoverBg}'],
  ['bg-blue-600', '${T.accentBg}'],
  ['hover:bg-blue-500', '${T.accentHover}'],
  ['text-blue-400', '${T.accentText}'],
  ['shadow-blue-600/20', '${T.shadow}']
];

for (let [find, rep] of reps) {
  code = code.split(find).join(rep);
}

fs.writeFileSync('src/lib/agents/pageTemplate.ts', code);
