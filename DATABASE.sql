-- Enable the uuid-ossp extension for UUID generation
create extension if not exists "uuid-ossp";

-- Create the todos table
create table todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table todos enable row level security;

-- Policy: Users can only view their own todos
create policy "Users can view their own todos"
  on todos for select
  using (auth.uid() = user_id);

-- Policy: Users can only insert their own todos
create policy "Users can create their own todos"
  on todos for insert
  with check (auth.uid() = user_id);

-- Policy: Users can only update their own todos
create policy "Users can update their own todos"
  on todos for update
  using (auth.uid() = user_id);

-- Policy: Users can only delete their own todos
create policy "Users can delete their own todos"
  on todos for delete
  using (auth.uid() = user_id);

-- Index for faster queries by user_id
create index todos_user_id_idx on todos(user_id);
