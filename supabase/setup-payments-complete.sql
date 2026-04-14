-- Complete payment system setup.
-- Safe to run multiple times (idempotent).
-- Run this in Supabase SQL Editor.

-- ─── 1. payment_settings table ───────────────────────────────────────────────

create table if not exists public.payment_settings (
  id smallint primary key default 1,
  credit_price_usd      numeric(10,2) not null default 1.00,
  stripe_enabled        boolean not null default false,
  stripe_public_key     text    not null default '',
  stripe_secret_key     text    not null default '',
  stripe_webhook_secret text    not null default '',
  paypal_enabled        boolean not null default false,
  paypal_client_id      text    not null default '',
  paypal_secret         text    not null default '',
  paypal_sandbox        boolean not null default false,
  bank_transfer_enabled boolean not null default true,
  bank_transfer_info    jsonb   not null default '{}',
  updated_at            timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- Add new columns if the table already existed without them
alter table public.payment_settings
  add column if not exists stripe_webhook_secret text not null default '',
  add column if not exists paypal_sandbox        boolean not null default false;

-- Seed the single config row
insert into public.payment_settings (id) values (1) on conflict do nothing;

-- ─── 2. credit_purchases table ───────────────────────────────────────────────

create table if not exists public.credit_purchases (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete set null,
  user_email       text        not null,
  credits          integer     not null check (credits > 0),
  amount_usd       numeric(10,2) not null check (amount_usd >= 0),
  payment_method   text        not null check (payment_method in ('stripe', 'paypal', 'bank_transfer')),
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected', 'completed')),
  payment_reference text,
  proof_url        text,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

do $$ begin
  create policy "users_own_purchases" on public.credit_purchases
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users_create_purchases" on public.credit_purchases
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists credit_purchases_status_idx on public.credit_purchases (status, created_at desc);
create index if not exists credit_purchases_user_idx   on public.credit_purchases (user_email, created_at desc);

-- ─── 3. RPC functions (SECURITY DEFINER — bypass PostgREST schema cache) ─────

create or replace function public.get_payment_settings()
returns json
language sql
security definer
set search_path = public
as $$
  select row_to_json(ps)
  from public.payment_settings ps
  where id = 1
  limit 1;
$$;

create or replace function public.get_public_payment_settings()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'credit_price_usd',      credit_price_usd,
    'stripe_enabled',        stripe_enabled,
    'stripe_public_key',     stripe_public_key,
    'paypal_enabled',        paypal_enabled,
    'paypal_client_id',      paypal_client_id,
    'bank_transfer_enabled', bank_transfer_enabled,
    'bank_transfer_info',    bank_transfer_info
  )
  from public.payment_settings
  where id = 1;
$$;

create or replace function public.set_payment_settings(patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_settings set
    credit_price_usd      = coalesce((patch->>'credit_price_usd')::numeric,     credit_price_usd),
    stripe_enabled        = coalesce((patch->>'stripe_enabled')::boolean,        stripe_enabled),
    stripe_public_key     = coalesce( patch->>'stripe_public_key',               stripe_public_key),
    stripe_secret_key     = coalesce( patch->>'stripe_secret_key',               stripe_secret_key),
    stripe_webhook_secret = coalesce( patch->>'stripe_webhook_secret',           stripe_webhook_secret),
    paypal_enabled        = coalesce((patch->>'paypal_enabled')::boolean,        paypal_enabled),
    paypal_client_id      = coalesce( patch->>'paypal_client_id',                paypal_client_id),
    paypal_secret         = coalesce( patch->>'paypal_secret',                   paypal_secret),
    paypal_sandbox        = coalesce((patch->>'paypal_sandbox')::boolean,        paypal_sandbox),
    bank_transfer_enabled = coalesce((patch->>'bank_transfer_enabled')::boolean, bank_transfer_enabled),
    bank_transfer_info    = coalesce((patch->>'bank_transfer_info')::jsonb,      bank_transfer_info),
    updated_at            = now()
  where id = 1;
end;
$$;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
