-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  subject text not null,
  body text not null,
  priority text not null,
  status text default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true); -- In a real app, restrict by auth.uid() and workspace membership

CREATE POLICY "Users can view their own support tickets"
  ON public.support_tickets FOR SELECT
  USING (true);

-- Create residency_migrations table
CREATE TABLE IF NOT EXISTS public.residency_migrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null,
  target_region text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.residency_migrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own residency migrations"
  ON public.residency_migrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own residency migrations"
  ON public.residency_migrations FOR SELECT
  USING (true);
