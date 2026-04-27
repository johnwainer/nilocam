-- ============================================================
-- Facial recognition tables
-- Run once in the Supabase SQL editor.
-- ============================================================

-- 1. persons — one row per detected or named person cluster
create table if not exists public.persons (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  display_name    text check (char_length(display_name) <= 100),
  instagram       text check (char_length(instagram) <= 60),
  tiktok          text check (char_length(tiktok) <= 60),
  cover_face_id   uuid,                       -- FK added after face_clusters is created
  face_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. face_clusters — one row per detected face in a photo
create table if not exists public.face_clusters (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  photo_id    uuid not null references public.photos(id) on delete cascade,
  person_id   uuid references public.persons(id) on delete set null,
  descriptor  float[] not null,               -- 128-dim face-api.js descriptor
  bbox        jsonb not null,                 -- {x, y, width, height} in pixels
  created_at  timestamptz not null default now()
);

-- 3. Add FK for cover_face_id now that face_clusters exists
alter table public.persons
  add constraint persons_cover_face_id_fkey
  foreign key (cover_face_id) references public.face_clusters(id) on delete set null;

-- 4. Indexes
create index if not exists face_clusters_event_id_idx  on public.face_clusters(event_id);
create index if not exists face_clusters_photo_id_idx  on public.face_clusters(photo_id);
create index if not exists face_clusters_person_id_idx on public.face_clusters(person_id);
create index if not exists persons_event_id_idx        on public.persons(event_id);

-- 5. RLS — use service role from API routes, disable RLS for these tables
alter table public.persons       disable row level security;
alter table public.face_clusters disable row level security;

-- 6. Helper function: increment person face_count atomically
create or replace function public.increment_person_face_count(p_person_id uuid)
returns void language sql security definer as $$
  update public.persons
  set face_count = face_count + 1,
      updated_at = now()
  where id = p_person_id;
$$;

-- 7. Enable realtime for persons (optional — for live admin updates)
alter publication supabase_realtime add table public.persons;
