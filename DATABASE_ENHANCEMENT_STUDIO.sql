-- ==============================================================================
-- BridgeBox Voice - Workspace Enhancement Studio Schema
-- ==============================================================================

-- ─── Workspace Enhancement Studio Core Tables ─────────────────────────────────

-- Enhancement Requests (Voice, Typed, Uploaded)
CREATE TABLE IF NOT EXISTS enhancement_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  title text NOT NULL,
  request_type text CHECK (request_type IN ('speak', 'type', 'upload', 'merge')),
  status text CHECK (status IN ('draft', 'submitted', 'analyzing', 'ready_for_review', 'approved', 'rejected', 'ready_to_apply', 'applied', 'failed')) DEFAULT 'analyzing',
  original_prompt text,
  structured_request jsonb, -- AI-parsed requirements
  analysis_summary text,
  recommendations jsonb,
  dependency_summary jsonb,
  conflict_summary jsonb,
  approval_status text DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhancement Media (Audio, Video, Images)
CREATE TABLE IF NOT EXISTS enhancement_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES enhancement_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  media_type text CHECK (media_type IN ('audio', 'video', 'image', 'document')),
  transcription text,
  created_at timestamptz DEFAULT now()
);

-- Workspace Asset Catalog (Reusable modules/templates)
CREATE TABLE IF NOT EXISTS workspace_asset_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  asset_type text CHECK (asset_type IN ('feature', 'workflow', 'form', 'ui_module', 'automation', 'prompt')),
  name text NOT NULL,
  description text,
  definition jsonb NOT NULL,
  dependencies jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transfer Batches (Merging assets across workspaces safely)
CREATE TABLE IF NOT EXISTS workspace_transfer_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_workspace_id uuid NOT NULL,
  target_workspace_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  status text CHECK (status IN ('draft', 'previewed', 'conflict_detected', 'approved', 'applied', 'partially_applied', 'failed', 'rolled_back')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transfer Items (Individual assets within a batch)
CREATE TABLE IF NOT EXISTS workspace_transfer_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid REFERENCES workspace_transfer_batches(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES workspace_asset_catalog(id) ON DELETE CASCADE,
  action text CHECK (action IN ('create', 'update', 'skip', 'clone')),
  status text CHECK (status IN ('pending', 'applied', 'failed', 'skipped', 'conflict')) DEFAULT 'pending',
  conflict_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Workspace Merge Audit Logs (Strict safety/history tracking)
CREATE TABLE IF NOT EXISTS workspace_merge_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── RLS Policies (Soft policies to allow frontend API usage until strict tenant isolation binds them) ───

ALTER TABLE enhancement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enhancement_requests_access" ON enhancement_requests FOR ALL USING (true);

ALTER TABLE enhancement_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enhancement_media_access" ON enhancement_media FOR ALL USING (true);

ALTER TABLE workspace_asset_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_asset_catalog_access" ON workspace_asset_catalog FOR ALL USING (true);

ALTER TABLE workspace_transfer_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_transfer_batches_access" ON workspace_transfer_batches FOR ALL USING (true);

ALTER TABLE workspace_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_transfer_items_access" ON workspace_transfer_items FOR ALL USING (true);

ALTER TABLE workspace_merge_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_merge_audit_logs_access" ON workspace_merge_audit_logs FOR ALL USING (true);
