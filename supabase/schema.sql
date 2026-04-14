create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  event_type_key text not null,
  owner_email text,
  event_date timestamptz,
  venue_name text,
  venue_city text,
  moderation_mode text not null default 'auto' check (moderation_mode in ('auto', 'manual')),
  max_upload_mb integer not null default 12 check (max_upload_mb between 2 and 40),
  landing_config jsonb not null,
  cover_image_url text,
  allow_guest_upload boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  original_name text,
  uploaded_by_name text,
  uploaded_by_email text,
  is_anonymous boolean not null default true,
  moderation_status text not null default 'pending' check (moderation_status in ('approved', 'pending', 'rejected')),
  filter_name text,
  template_key text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_owner_email_idx on public.events (owner_email);
create index if not exists photos_event_id_created_at_idx on public.photos (event_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
before update on public.photos
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, ''),
    'owner'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  );
$$;

create or replace function public.is_event_owner_or_admin(event_owner_email text)
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
    or auth.role() = 'authenticated'
       and auth.jwt() ->> 'email' = event_owner_email;
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;

drop policy if exists "profiles read own or super admin" on public.profiles;
create policy "profiles read own or super admin"
on public.profiles
for select
using (auth.uid() = id or public.is_super_admin());

drop policy if exists "profiles update own or super admin" on public.profiles;
create policy "profiles update own or super admin"
on public.profiles
for update
using (auth.uid() = id or public.is_super_admin())
with check (auth.uid() = id or public.is_super_admin());

drop policy if exists "events public read" on public.events;
create policy "events public read"
on public.events
for select
using (true);

drop policy if exists "events insert by authenticated email or super admin" on public.events;
create policy "events insert by authenticated email or super admin"
on public.events
for insert
with check (
  public.is_super_admin()
  or (auth.role() = 'authenticated' and auth.jwt() ->> 'email' = owner_email)
);

drop policy if exists "events update by owner or super admin" on public.events;
create policy "events update by owner or super admin"
on public.events
for update
using (public.is_event_owner_or_admin(owner_email))
with check (public.is_event_owner_or_admin(owner_email));

drop policy if exists "events delete by owner or super admin" on public.events;
create policy "events delete by owner or super admin"
on public.events
for delete
using (public.is_event_owner_or_admin(owner_email));

drop policy if exists "photos public read approved or super admin" on public.photos;
create policy "photos public read approved or super admin"
on public.photos
for select
using (moderation_status = 'approved' or public.is_super_admin());

drop policy if exists "photos public insert" on public.photos;
create policy "photos public insert"
on public.photos
for insert
with check (true);

drop policy if exists "photos super admin update" on public.photos;
create policy "photos super admin update"
on public.photos
for update
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "photos super admin delete" on public.photos;
create policy "photos super admin delete"
on public.photos
for delete
using (public.is_super_admin());

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

drop policy if exists "event photos public read" on storage.objects;
create policy "event photos public read"
on storage.objects
for select
using (bucket_id = 'event-photos');

drop policy if exists "event photos public insert" on storage.objects;
create policy "event photos public insert"
on storage.objects
for insert
with check (bucket_id = 'event-photos');

drop policy if exists "event photos super admin update" on storage.objects;
create policy "event photos super admin update"
on storage.objects
for update
using (bucket_id = 'event-photos' and public.is_super_admin())
with check (bucket_id = 'event-photos' and public.is_super_admin());

drop policy if exists "event photos super admin delete" on storage.objects;
create policy "event photos super admin delete"
on storage.objects
for delete
using (bucket_id = 'event-photos' and public.is_super_admin());
