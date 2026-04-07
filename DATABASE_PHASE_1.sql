-- Phase 1: Due Dates and Priorities
-- Run this in your Supabase SQL Editor

-- Add due_date and priority columns to existing todos table
ALTER TABLE todos 
  ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS priority text default 'medium' check (priority in ('low', 'medium', 'high'));
