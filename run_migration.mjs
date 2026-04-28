/**
 * BridgeBox Voice — Full Schema Migration Runner
 * Uses Supabase anon key + postgres REST endpoint to create all missing tables.
 * Run with: node run_migration.mjs
 */

const SUPABASE_URL = 'https://xuplmlfnhdtkqwbgplop.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1cGxtbGZuaGR0a3F3YmdwbG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzc4MzcsImV4cCI6MjA5MDE1MzgzN30.TPfQvOeDKGeSiqLszqYP2agnBQUHUSuVaa5hq2yUayA'

// Split into individual statements to run one at a time
const statements = [
  `CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Workspace',
  logo_url text,
  plan text DEFAULT 'starter',
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspaces' AND policyname='workspaces_policy') THEN CREATE POLICY "workspaces_policy" ON public.workspaces FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
)`,
  `ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_members' AND policyname='workspace_members_policy') THEN CREATE POLICY "workspace_members_policy" ON public.workspace_members FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'member',
  status text DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_invitations' AND policyname='workspace_invitations_policy') THEN CREATE POLICY "workspace_invitations_policy" ON public.workspace_invitations FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_id text NOT NULL,
  integration_name text NOT NULL,
  auth_type text NOT NULL DEFAULT 'api_key',
  api_key_hash text,
  config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'connected',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_integrations' AND policyname='workspace_integrations_policy') THEN CREATE POLICY "workspace_integrations_policy" ON public.workspace_integrations FOR ALL USING (true); END IF; END $$`,

  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='workspace_id') THEN ALTER TABLE public.projects ADD COLUMN workspace_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='industry') THEN ALTER TABLE public.projects ADD COLUMN industry text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='transcript') THEN ALTER TABLE public.projects ADD COLUMN transcript text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='spec') THEN ALTER TABLE public.projects ADD COLUMN spec jsonb; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='github_repo_url') THEN ALTER TABLE public.projects ADD COLUMN github_repo_url text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='web_app_url') THEN ALTER TABLE public.projects ADD COLUMN web_app_url text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='preview_html') THEN ALTER TABLE public.projects ADD COLUMN preview_html text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN ALTER TABLE public.projects ADD COLUMN user_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='mobile_app_url') THEN ALTER TABLE public.projects ADD COLUMN mobile_app_url text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='desktop_app_url') THEN ALTER TABLE public.projects ADD COLUMN desktop_app_url text; END IF;
END $$`,

  `CREATE TABLE IF NOT EXISTS public.recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text,
  duration_seconds integer,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recordings' AND policyname='recordings_policy') THEN CREATE POLICY "recordings_policy" ON public.recordings FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.captures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text DEFAULT 'screenshot',
  file_path text,
  url_captured text,
  dom_snapshot jsonb,
  network_logs jsonb,
  ai_analysis jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='captures' AND policyname='captures_policy') THEN CREATE POLICY "captures_policy" ON public.captures FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.screen_captures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid,
  user_id uuid REFERENCES auth.users(id),
  type text DEFAULT 'screenshot',
  file_path text,
  title text,
  description text,
  ai_analysis jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.screen_captures ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='screen_captures' AND policyname='screen_captures_policy') THEN CREATE POLICY "screen_captures_policy" ON public.screen_captures FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.project_deployments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  platform text DEFAULT 'web',
  version_number text,
  url text,
  status text DEFAULT 'building',
  build_logs text,
  deployed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.project_deployments ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_deployments' AND policyname='project_deployments_policy') THEN CREATE POLICY "project_deployments_policy" ON public.project_deployments FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.project_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid,
  service_name text NOT NULL,
  auth_type text,
  credentials jsonb,
  config jsonb,
  status text DEFAULT 'connected',
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_integrations' AND policyname='project_integrations_policy') THEN CREATE POLICY "project_integrations_policy" ON public.project_integrations FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.todos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  priority text DEFAULT 'medium',
  due_date date,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='todos' AND policyname='todos_policy') THEN CREATE POLICY "todos_policy" ON public.todos FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.enhancement_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  created_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  request_type text DEFAULT 'type',
  status text DEFAULT 'draft',
  original_prompt text,
  structured_request jsonb,
  analysis_summary text,
  recommendations jsonb,
  dependency_summary jsonb,
  conflict_summary jsonb,
  approval_status text DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.enhancement_requests ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='enhancement_requests' AND policyname='enhancement_requests_policy') THEN CREATE POLICY "enhancement_requests_policy" ON public.enhancement_requests FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.service_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  display_name text NOT NULL,
  status text DEFAULT 'operational',
  description text,
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.service_status ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_status' AND policyname='service_status_policy') THEN CREATE POLICY "service_status_policy" ON public.service_status FOR ALL USING (true); END IF; END $$`,

  `INSERT INTO public.service_status (service_name, display_name, status) VALUES
  ('api', 'API Gateway', 'operational'),
  ('auth', 'Authentication', 'operational'),
  ('database', 'Database', 'operational'),
  ('ai_engine', 'AI Engine', 'operational'),
  ('deployments', 'Deployment Pipeline', 'operational'),
  ('storage', 'File Storage', 'operational')
ON CONFLICT DO NOTHING`,

  `CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'minor',
  status text DEFAULT 'investigating',
  affected_services text[],
  started_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='incidents' AND policyname='incidents_policy') THEN CREATE POLICY "incidents_policy" ON public.incidents FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_asset_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  name text NOT NULL,
  description text,
  definition jsonb,
  dependencies jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_asset_catalog ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_asset_catalog' AND policyname='workspace_asset_catalog_policy') THEN CREATE POLICY "workspace_asset_catalog_policy" ON public.workspace_asset_catalog FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_merge_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_workspace_id uuid,
  target_workspace_id uuid,
  performed_by uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_merge_audit_logs ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_merge_audit_logs' AND policyname='workspace_merge_audit_logs_policy') THEN CREATE POLICY "workspace_merge_audit_logs_policy" ON public.workspace_merge_audit_logs FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_transfer_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_workspace_id uuid,
  target_workspace_id uuid,
  created_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_transfer_batches ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_transfer_batches' AND policyname='workspace_transfer_batches_policy') THEN CREATE POLICY "workspace_transfer_batches_policy" ON public.workspace_transfer_batches FOR ALL USING (true); END IF; END $$`,

  `CREATE TABLE IF NOT EXISTS public.workspace_transfer_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid REFERENCES public.workspace_transfer_batches(id) ON DELETE CASCADE,
  asset_id uuid,
  action text DEFAULT 'create',
  status text DEFAULT 'pending',
  conflict_details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
)`,
  `ALTER TABLE public.workspace_transfer_items ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workspace_transfer_items' AND policyname='workspace_transfer_items_policy') THEN CREATE POLICY "workspace_transfer_items_policy" ON public.workspace_transfer_items FOR ALL USING (true); END IF; END $$`,
]

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql })
  })
  return res
}

// Try using the postgres extension directly via the REST API
async function executeViaSuperbase(sql) {
  try {
    // Try the SQL API endpoint
    const res = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

console.log('BridgeBox Voice Schema Migration')
console.log('=================================')
console.log('Note: The anon key cannot run DDL directly.')
console.log('Please run the SQL file manually in the Supabase Dashboard SQL Editor:')
console.log('https://supabase.com/dashboard/project/xuplmlfnhdtkqwbgplop/sql/new')
console.log('')
console.log('File: supabase/migrations/20260427192500_full_app_schema.sql')
console.log('')
console.log('Statements to run:', statements.length)
