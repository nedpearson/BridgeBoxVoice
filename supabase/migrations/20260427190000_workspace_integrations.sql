CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_id text NOT NULL,
  integration_name text NOT NULL,
  auth_type text NOT NULL,
  api_key_hash text,
  connected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, integration_id)
);

ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage integrations for their workspaces" ON public.workspace_integrations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );
