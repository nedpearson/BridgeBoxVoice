import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim()) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

// Find the project by searching all projects
async function main() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,name,status&limit=20`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const data = await r.json();
  console.log('Projects found:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
