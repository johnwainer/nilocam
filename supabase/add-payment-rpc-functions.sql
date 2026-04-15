-- RPC functions for payment_settings.
-- Using SECURITY DEFINER functions so PostgREST can execute them even if
-- the payment_settings table isn't in its schema cache yet.
-- Run this in Supabase SQL Editor.

-- Returns ALL settings (used by server-side admin routes only — never exposed to client).
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

-- Returns only public fields (used by the buy-credits modal public endpoint).
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

-- Updates payment settings. Accepts a JSON patch; null values are ignored.
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

-- Force PostgREST to reload its schema cache so the new functions are available.
notify pgrst, 'reload schema';
