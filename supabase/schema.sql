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
  visibility text not null default 'moderated',
  allow_anonymous boolean not null default true,
  require_guest_name boolean not null default false,
  max_photo_mb integer not null default 12,
  highlight_limit integer not null default 6,
  logo_text text not null default 'Nilo Cam',
  hero_tagline text not null default '',
  landing_sections jsonb not null default '[]'::jsonb,
  ctas jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.events(slug) on delete cascade,
  src text not null,
  author_name text not null default '',
  anonymous boolean not null default false,
  note text not null default '',
  status text not null default 'pending',
  filter text not null default 'none',
  template text not null default 'full-bleed',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.photos enable row level security;

create policy "Public read events" on public.events
  for select using (true);

create policy "Public read photos" on public.photos
  for select using (true);

create policy "Public insert photos" on public.photos
  for insert with check (true);

create policy "Public update events" on public.events
  for update using (true);

create policy "Public insert events" on public.events
  for insert with check (true);

