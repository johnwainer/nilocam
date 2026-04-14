-- Run this in Supabase SQL Editor to add event active/inactive status.
alter table public.events
  add column if not exists is_active boolean not null default true;
