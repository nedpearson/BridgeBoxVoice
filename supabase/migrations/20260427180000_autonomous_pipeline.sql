-- ==============================================================================
-- BridgeBox Voice - Autonomous Project Pipeline Schema
-- ==============================================================================

-- ─── Pipeline Core Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_pipeline_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text CHECK (status IN ('running', 'paused', 'failed', 'completed')) DEFAULT 'running',
  current_stage_index integer DEFAULT 1,
  total_stages integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES project_pipeline_runs(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  stage_index integer NOT NULL,
  status text CHECK (status IN ('pending', 'running', 'done', 'warning', 'failed', 'skipped')) DEFAULT 'pending',
  agent_name text,
  progress_pct integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  log_level text CHECK (log_level IN ('info', 'warn', 'error', 'success')),
  message text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── Agent Interactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text CHECK (status IN ('running', 'success', 'failed')) DEFAULT 'running',
  token_usage integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  role text CHECK (role IN ('system', 'user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── Output Artifacts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  artifact_type text NOT NULL, -- 'spec', 'schema', 'architecture', 'design', etc.
  content jsonb NOT NULL,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  file_path text NOT NULL,
  content text NOT NULL,
  language text,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Specific Artifacts (structured for easier querying) ────────────────────

CREATE TABLE IF NOT EXISTS project_specs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  business_type text,
  target_audience text,
  monetization_model text,
  core_features jsonb,
  user_roles jsonb,
  success_criteria jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  tables jsonb NOT NULL,
  relationships jsonb,
  policies jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screen_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  routes jsonb NOT NULL,
  navigation jsonb,
  components jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  required_services jsonb NOT NULL,
  auth_flows jsonb,
  webhooks jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qa_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  passed boolean DEFAULT false,
  checks_run integer DEFAULT 0,
  issues_found jsonb,
  auto_fixed_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deployment_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  url text,
  environment text DEFAULT 'production',
  status text CHECK (status IN ('building', 'live', 'failed')),
  build_logs text,
  deployed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS Policies (Allow frontend API usage) ────────────────────────────────

ALTER TABLE project_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_pipeline_runs_access" ON project_pipeline_runs FOR ALL USING (true);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_stages_access" ON pipeline_stages FOR ALL USING (true);

ALTER TABLE pipeline_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_logs_access" ON pipeline_logs FOR ALL USING (true);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs_access" ON agent_runs FOR ALL USING (true);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_messages_access" ON agent_messages FOR ALL USING (true);

ALTER TABLE generated_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_artifacts_access" ON generated_artifacts FOR ALL USING (true);

ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_files_access" ON generated_files FOR ALL USING (true);

ALTER TABLE project_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_specs_access" ON project_specs FOR ALL USING (true);

ALTER TABLE schema_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schema_plans_access" ON schema_plans FOR ALL USING (true);

ALTER TABLE screen_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "screen_maps_access" ON screen_maps FOR ALL USING (true);

ALTER TABLE integration_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_plans_access" ON integration_plans FOR ALL USING (true);

ALTER TABLE qa_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_reports_access" ON qa_reports FOR ALL USING (true);

ALTER TABLE deployment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployment_records_access" ON deployment_records FOR ALL USING (true);
