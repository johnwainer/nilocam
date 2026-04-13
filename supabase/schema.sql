create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text not null default '',
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'moderator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  event_type text not null,
  date_label text not null default '',
  venue text not null default '',
  organizer text not null default '',
  public_url text not null default '',
  qr_label text not null default '',
  visibility text not null default 'moderated' check (visibility in ('public', 'moderated')),
  allow_anonymous boolean not null default true,
  require_guest_name boolean not null default false,
  max_photo_mb integer not null default 12,
  highlight_limit integer not null default 6,
  logo_text text not null default 'Nilo Cam',
  hero_tagline text not null default '',
  landing_sections jsonb not null default '[]'::jsonb,
  ctas jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'editor', 'moderator')),
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.events(slug) on delete cascade,
  src text not null,
  author_name text not null default '',
  anonymous boolean not null default false,
  note text not null default '',
  status text not null default 'pending' check (status in ('published', 'pending')),
  filter text not null default 'none',
  template text not null default 'full-bleed',
  storage_path text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_events_owner_profile_id on public.events(owner_profile_id);
create index if not exists idx_event_members_profile_id on public.event_members(profile_id);
create index if not exists idx_photos_event_slug_created_at on public.photos(event_slug, created_at desc);

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.photos enable row level security;

create policy "Profiles select own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Events public read" on public.events
  for select using (true);

create policy "Events public insert" on public.events
  for insert with check (true);

create policy "Events public update" on public.events
  for update using (true);

create policy "Members read own event" on public.event_members
  for select using (
    auth.uid() = profile_id
    or exists (
      select 1
      from public.events e
      where e.id = event_members.event_id
        and e.owner_profile_id = auth.uid()
    )
  );

create policy "Photos public read" on public.photos
  for select using (true);

create policy "Photos public insert" on public.photos
  for insert with check (true);

create policy "Photos public update" on public.photos
  for update using (true);

comment on table public.events is 'Events generated from the admin. Writes are done by the server route using the service role.';
comment on table public.photos is 'Event photos with a public read path and server-side writes.';
comment on table public.event_members is 'Event access roles for owners and collaborators.';

create policy "Public read event photos" on storage.objects
  for select using (bucket_id = 'event-photos');

create policy "Authenticated upload event photos" on storage.objects
  for insert with check (
    bucket_id = 'event-photos'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated update event photos" on storage.objects
  for update using (
    bucket_id = 'event-photos'
    and auth.role() = 'authenticated'
  );
