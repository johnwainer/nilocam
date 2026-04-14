-- Add metadata columns to photos table.
-- Run in Supabase SQL Editor.

alter table public.photos
  add column if not exists original_size_bytes bigint,
  add column if not exists original_mime_type  text,
  add column if not exists original_width      integer,
  add column if not exists original_height     integer,
  add column if not exists exif_data           jsonb,
  add column if not exists device_data         jsonb,
  add column if not exists upload_ip           text;
