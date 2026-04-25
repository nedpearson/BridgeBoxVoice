-- ============================================================
-- Bridgebox Voice — Platform Database Schema
-- Run this in Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  company_name text,
  industry text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  logo_url text,
  plan text default 'starter' check (plan in ('starter', 'professional', 'business', 'enterprise')),
  created_at timestamptz default now()
);

-- Projects (each project = one generated app)
CREATE TABLE IF NOT EXISTS projects (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  industry text,
  transcript text,
  status text check (status in ('recording', 'analyzing', 'building', 'deployed', 'failed')) default 'recording',
  spec jsonb,
  github_repo_url text,
  web_app_url text,
  mobile_app_url text,
  desktop_app_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Voice Recordings
CREATE TABLE IF NOT EXISTS recordings (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_path text,
  duration_seconds integer,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz default now()
);

-- Screen Captures
CREATE TABLE IF NOT EXISTS captures (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('screenshot', 'video', 'flow')),
  file_path text,
  url_captured text,
  dom_snapshot jsonb,
  network_logs jsonb,
  ai_analysis jsonb,
  created_at timestamptz default now()
);

-- App Specifications
CREATE TABLE IF NOT EXISTS specifications (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  features jsonb,
  data_models jsonb,
  integrations jsonb,
  user_roles jsonb,
  dashboards jsonb,
  approved boolean default false,
  created_at timestamptz default now()
);

-- Generated Code Versions
CREATE TABLE IF NOT EXISTS code_versions (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  version_number text not null,
  commit_sha text,
  files jsonb,
  changelog text,
  deployed boolean default false,
  created_at timestamptz default now()
);

-- Project Integrations
CREATE TABLE IF NOT EXISTS project_integrations (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  service_name text not null,
  auth_type text check (auth_type in ('oauth', 'api_key', 'basic', 'webhook')),
  credentials jsonb,
  config jsonb,
  status text check (status in ('connected', 'disconnected', 'error')) default 'disconnected',
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

-- Workspace Integrations
CREATE TABLE IF NOT EXISTS workspace_integrations (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  integration_id text not null,
  integration_name text not null,
  auth_type text check (auth_type in ('oauth', 'api_key')),
  api_key_hash text,
  connected_at timestamptz default now(),
  UNIQUE(workspace_id, integration_id)
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'admin', 'member')) default 'member',
  created_at timestamptz default now(),
  UNIQUE(workspace_id, user_id)
);

-- Workspace Invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  email text not null,
  role text check (role in ('admin', 'member')) default 'member',
  token text,
  status text default 'pending',
  created_at timestamptz default now(),
  UNIQUE(workspace_id, email)
);

-- Screen Captures (Unassigned / Global captures before assigning to project)
CREATE TABLE IF NOT EXISTS screen_captures (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('screenshot', 'video', 'flow')),
  file_path text,
  url_captured text,
  dom_snapshot jsonb,
  network_logs jsonb,
  ai_analysis jsonb,
  created_at timestamptz default now()
);

-- SMS Queue
CREATE TABLE IF NOT EXISTS sms_queue (
  id uuid default uuid_generate_v4() primary key,
  "to" text not null,
  message text not null,
  send_at timestamptz not null,
  appointment_id uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  platform text check (platform in ('web', 'ios', 'android', 'windows', 'mac', 'linux')),
  version_number text,
  url text,
  status text check (status in ('building', 'live', 'failed')) default 'building',
  build_logs text,
  deployed_at timestamptz default now()
);

-- App Analytics
CREATE TABLE IF NOT EXISTS app_analytics (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  metric_name text not null,
  value numeric default 0,
  metadata jsonb,
  recorded_at timestamptz default now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null,
  status text default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only see/edit their own profile
CREATE POLICY "Users manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- workspaces: owner has full access
CREATE POLICY "Workspace owner access" ON workspaces
  FOR ALL USING (auth.uid() = owner_id);

-- projects: access via workspace ownership
CREATE POLICY "Projects via workspace" ON projects
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- recordings: access via ownership
CREATE POLICY "Recordings via user" ON recordings
  FOR ALL USING (auth.uid() = user_id);

-- captures: access via ownership
CREATE POLICY "Captures via user" ON captures
  FOR ALL USING (auth.uid() = user_id);

-- specifications: access via project → workspace
CREATE POLICY "Specs via project" ON specifications
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = auth.uid()
    )
  );

-- code_versions: access via project → workspace
CREATE POLICY "Code versions via project" ON code_versions
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = auth.uid()
    )
  );

-- project_integrations: access via project → workspace
CREATE POLICY "Integrations via project" ON project_integrations
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = auth.uid()
    )
  );

-- deployments: access via project → workspace
CREATE POLICY "Deployments via project" ON deployments
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = auth.uid()
    )
  );

-- analytics: access via project → workspace
CREATE POLICY "Analytics via project" ON app_analytics
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.owner_id = auth.uid()
    )
  );

-- subscriptions: access via workspace ownership
CREATE POLICY "Subscriptions via workspace" ON subscriptions
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- workspace_integrations: access via workspace ownership
CREATE POLICY "Workspace integrations via workspace" ON workspace_integrations
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- workspace_members: access via workspace ownership
CREATE POLICY "Workspace members via workspace" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- workspace_invitations: access via workspace ownership
CREATE POLICY "Workspace invitations via workspace" ON workspace_invitations
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- screen_captures: access via workspace ownership
CREATE POLICY "Screen captures via workspace" ON screen_captures
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- sms_queue: authenticated users can insert and view
CREATE POLICY "SMS queue accessible by authenticated users" ON sms_queue
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- AUTO-CREATE WORKSPACE & PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');

  INSERT INTO public.workspaces (owner_id, name, plan)
  VALUES (new.id, 'My Workspace', 'starter');

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
