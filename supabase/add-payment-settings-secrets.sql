-- Add stripe_webhook_secret and paypal_sandbox to payment_settings.
-- Run in Supabase SQL Editor.

alter table public.payment_settings
  add column if not exists stripe_webhook_secret text not null default '',
  add column if not exists paypal_sandbox boolean not null default false;
