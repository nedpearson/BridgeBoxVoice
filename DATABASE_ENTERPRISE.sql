-- Bridgebox Voice Enterprise Database Migration
-- Run after DATABASE_PLATFORM.sql

-- ─── SSO & Identity ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sso_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider text CHECK (provider IN ('okta', 'azure_ad', 'google', 'onelogin', 'custom_saml')),
  saml_metadata_url text,
  saml_entity_id text,
  saml_acs_url text,
  scim_token_hash text,
  scim_enabled boolean DEFAULT false,
  jit_provisioning boolean DEFAULT true,
  default_role text DEFAULT 'member',
  attribute_mapping jsonb DEFAULT '{"email":"email","first_name":"firstName","last_name":"lastName"}',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scim_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  external_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  display_name text,
  emails jsonb,
  active boolean DEFAULT true,
  groups jsonb,
  raw_attributes jsonb,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, external_id)
);

-- ─── RBAC ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS abac_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  condition jsonb NOT NULL, -- {"attribute": "department", "operator": "eq", "value": "finance"}
  effect text CHECK (effect IN ('allow', 'deny')) DEFAULT 'allow',
  resource_pattern text NOT NULL, -- 'revenue_data.*'
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_action text NOT NULL, -- 'code.deploy', 'user.delete', 'billing.change'
  approver_role text,
  approver_user_id uuid REFERENCES auth.users(id),
  timeout_hours integer DEFAULT 48,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid REFERENCES approval_workflows(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  notes text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ─── Audit ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  country_code char(2),
  signature text NOT NULL, -- HMAC-SHA256 of (id||action||user_id||created_at)
  created_at timestamptz DEFAULT now()
);

-- Immutable: no UPDATE or DELETE allowed (enforced by RLS + trigger)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_immutable ON audit_logs;
CREATE TRIGGER audit_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ─── Security ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ip_allowlists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  cidr inet NOT NULL,
  label text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  session_timeout_minutes integer DEFAULT 480,
  max_concurrent_sessions integer DEFAULT 5,
  require_mfa boolean DEFAULT false,
  mfa_methods jsonb DEFAULT '["totp"]',
  idle_timeout_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS rate_limit_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  endpoint_pattern text NOT NULL,
  requests_per_minute integer DEFAULT 60,
  requests_per_hour integer DEFAULT 1000,
  requests_per_day integer DEFAULT 10000,
  burst_size integer DEFAULT 20,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ─── Data Governance ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_residency_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  primary_region text DEFAULT 'us-east-1',
  allowed_regions jsonb DEFAULT '["us-east-1"]',
  geo_fence_countries jsonb,
  geo_fence_mode text CHECK (geo_fence_mode IN ('allowlist', 'blocklist')) DEFAULT 'allowlist',
  cross_border_transfers boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

CREATE TABLE IF NOT EXISTS data_classification_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  classification text CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
  pattern text, -- regex for detection
  field_paths jsonb, -- ["users.ssn", "payments.card_number"]
  masking_strategy text CHECK (masking_strategy IN ('redact', 'hash', 'tokenize', 'partial')) DEFAULT 'redact',
  roles_with_access jsonb DEFAULT '["admin"]',
  created_at timestamptz DEFAULT now()
);

-- ─── Feature Flags ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  flag_name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  targeting_rules jsonb, -- {"user_ids": [...], "emails": [...]}
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, flag_name)
);

-- ─── API Keys ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  project_id uuid,
  name text NOT NULL,
  key_prefix text NOT NULL, -- first 8 chars for display (e.g. bb_live_ab)
  key_hash text NOT NULL, -- SHA-256 hash of full key
  scopes jsonb DEFAULT '[]', -- ['read:projects', 'write:captures']
  last_used_at timestamptz,
  expires_at timestamptz,
  requests_today integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ─── Plugins ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plugins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  publisher text NOT NULL,
  version text NOT NULL,
  icon_url text,
  category text,
  price_cents integer DEFAULT 0,
  manifest jsonb NOT NULL, -- {permissions, entry_point, api_version}
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending',
  downloads integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_plugins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  plugin_id uuid REFERENCES plugins(id) ON DELETE CASCADE NOT NULL,
  config jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, plugin_id)
);

-- ─── White-Label ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_branding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  brand_name text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#6366F1',
  secondary_color text DEFAULT '#F97316',
  custom_domain text,
  custom_css text,
  email_from_name text,
  email_from_address text,
  support_email text,
  help_url text,
  hide_powered_by boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- ─── Backup & DR ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS backup_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  backup_type text CHECK (backup_type IN ('full', 'incremental', 'snapshot')),
  status text CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  file_path text,
  checksum text,
  size_bytes bigint,
  encryption_key_id text,
  region text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  cron_expression text DEFAULT '0 0 * * *', -- daily at midnight
  backup_type text DEFAULT 'full',
  retention_days integer DEFAULT 30,
  target_regions jsonb DEFAULT '["us-east-1"]',
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- ─── Incidents & Status ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  severity text CHECK (severity IN ('minor', 'major', 'critical', 'maintenance')),
  status text CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  affected_services jsonb DEFAULT '[]',
  started_at timestamptz NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  status text CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage')) DEFAULT 'operational',
  description text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO service_status (service_name, display_name) VALUES
  ('api', 'API'),
  ('web_app', 'Web Application'),
  ('voice_transcription', 'Voice Transcription'),
  ('ai_generation', 'AI Code Generation'),
  ('file_storage', 'File Storage'),
  ('database', 'Database'),
  ('chrome_extension', 'Chrome Extension'),
  ('mobile_apps', 'Mobile Apps')
ON CONFLICT (service_name) DO NOTHING;

-- ─── Support Tickets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category text CHECK (category IN ('billing', 'technical', 'account', 'security', 'feature')) DEFAULT 'technical',
  status text CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ─── AI Governance ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generation_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  project_id uuid,
  user_id uuid REFERENCES auth.users(id),
  model_version text NOT NULL, -- 'claude-3-5-sonnet-20241022'
  prompt_tokens integer,
  completion_tokens integer,
  action text NOT NULL, -- 'transcribe', 'analyze', 'generate_code', 'review_code'
  input_hash text, -- SHA-256 of input (not stored in full)
  safety_flags jsonb DEFAULT '{}', -- {prompt_injection: false, pii_detected: false}
  human_review_required boolean DEFAULT false,
  review_outcome text CHECK (review_outcome IN ('approved', 'rejected', 'pending')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_caps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  monthly_token_limit bigint DEFAULT 1000000,
  daily_generation_limit integer DEFAULT 100,
  tokens_used_this_month bigint DEFAULT 0,
  generations_today integer DEFAULT 0,
  reset_date date DEFAULT date_trunc('month', now()),
  alert_threshold_percent integer DEFAULT 80,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- ─── Compliance ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  report_type text CHECK (report_type IN ('soc2', 'gdpr', 'hipaa', 'pci', 'iso27001', 'ccpa')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text CHECK (status IN ('generating', 'ready', 'expired')) DEFAULT 'generating',
  file_url text,
  generated_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_allowlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;

-- Example RLS: workspace members can read their workspace data
CREATE POLICY "workspace_read" ON sso_configs FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_admin_write" ON sso_configs FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Audit logs: read-only for workspace admins
CREATE POLICY "audit_read" ON audit_logs FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Incidents: public read (status page)
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_public_read" ON incidents FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_status_public_read" ON service_status FOR SELECT TO anon, authenticated USING (true);
