-- Add initial_credits pricing key.
-- Run in Supabase SQL Editor.

insert into public.credit_pricing (key, label, description, credits)
values ('initial_credits', 'Créditos al registrarse', 'Créditos otorgados automáticamente cuando una cuenta nueva se registra por primera vez', 10)
on conflict (key) do nothing;
