-- Payment settings (single-row config, managed by super admin)
-- Run in Supabase SQL Editor.

create table if not exists public.payment_settings (
  id smallint primary key default 1,
  credit_price_usd numeric(10,2) not null default 1.00,
  stripe_enabled boolean not null default false,
  stripe_public_key text not null default '',
  stripe_secret_key text not null default '',
  paypal_enabled boolean not null default false,
  paypal_client_id text not null default '',
  paypal_secret text not null default '',
  bank_transfer_enabled boolean not null default true,
  bank_transfer_info jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- Seed the single row
insert into public.payment_settings (id) values (1) on conflict do nothing;

-- Credit purchases (records every purchase attempt)
create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  credits integer not null check (credits > 0),
  amount_usd numeric(10,2) not null check (amount_usd >= 0),
  payment_method text not null check (payment_method in ('stripe', 'paypal', 'bank_transfer')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed')),
  payment_reference text,        -- Stripe PaymentIntent ID / PayPal order ID
  proof_url text,                -- Bank transfer: proof image
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for credit_purchases
alter table public.credit_purchases enable row level security;

-- Users can see their own purchases
create policy "users_own_purchases" on public.credit_purchases
  for select using (auth.uid() = user_id);

-- Users can create their own purchases
create policy "users_create_purchases" on public.credit_purchases
  for insert with check (auth.uid() = user_id);

-- Service role (backend) can do everything via service key — no policy needed for that
-- Super admins can read all via API (service role), not direct table RLS needed

-- Index for admin listing
create index if not exists credit_purchases_status_idx on public.credit_purchases (status, created_at desc);
create index if not exists credit_purchases_user_idx   on public.credit_purchases (user_email, created_at desc);
