-- Fix "stack depth limit exceeded" caused by recursive RLS policies.
--
-- is_super_admin() and is_event_owner_or_admin() query public.profiles,
-- which itself has RLS policies that call is_super_admin() again →
-- infinite recursion.  Adding SECURITY DEFINER makes these functions
-- execute as their owner (bypassing RLS on the profiles lookup).

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (
      auth.role() = 'authenticated'
      and auth.jwt() ->> 'email' = event_owner_email
    );
$$;
