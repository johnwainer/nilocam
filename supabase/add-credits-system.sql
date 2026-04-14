-- Run this in Supabase SQL Editor to add the credits system.

-- 1. Credits balance on user profiles
alter table public.profiles
  add column if not exists credits integer not null default 0;

-- 2. Photo capacity on events (0 = no photos allowed until a pack is purchased)
alter table public.events
  add column if not exists photo_limit integer not null default 0;

-- 3. Configurable credit pricing (edited by super admin)
create table if not exists public.credit_pricing (
  key         text primary key,
  label       text not null,
  description text not null default '',
  credits     integer not null,
  updated_at  timestamptz not null default now()
);

-- Default pricing
insert into public.credit_pricing (key, label, description, credits) values
  ('event_creation', 'Crear evento',   'Activa la landing personalizada con QR para tu evento', 5),
  ('photos_100',     'Pack 100 fotos', 'Permite que los invitados suban hasta 100 fotos',        3),
  ('photos_200',     'Pack 200 fotos', 'Permite que los invitados suban hasta 200 fotos',        5),
  ('photos_500',     'Pack 500 fotos', 'Permite que los invitados suban hasta 500 fotos',       10)
on conflict (key) do nothing;

-- 4. Transaction ledger (audit trail)
create table if not exists public.credit_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  amount      integer not null,          -- positive = credit added, negative = debit
  type        text not null,             -- event_creation | photos_100 | photos_200 | photos_500 | manual_grant | manual_deduct
  event_id    uuid references public.events(id) on delete set null,
  event_slug  text,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx  on public.credit_transactions (user_id, created_at desc);
create index if not exists credit_transactions_event_id_idx on public.credit_transactions (event_id);

-- 5. RLS for new tables
alter table public.credit_pricing     enable row level security;
alter table public.credit_transactions enable row level security;

-- Pricing: anyone can read, only super admin can write
drop policy if exists "credit_pricing public read" on public.credit_pricing;
create policy "credit_pricing public read"
  on public.credit_pricing for select using (true);

drop policy if exists "credit_pricing super admin write" on public.credit_pricing;
create policy "credit_pricing super admin write"
  on public.credit_pricing for all using (public.is_super_admin());

-- Transactions: users see their own, super admin sees all
drop policy if exists "credit_transactions own read" on public.credit_transactions;
create policy "credit_transactions own read"
  on public.credit_transactions for select
  using (auth.uid() = user_id or public.is_super_admin());

drop policy if exists "credit_transactions service insert" on public.credit_transactions;
create policy "credit_transactions service insert"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id or public.is_super_admin());
