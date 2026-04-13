-- Run this after your user exists in Supabase Auth.
-- Replace the email if needed.

insert into public.profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email, 'Super Admin'),
  'super_admin'
from auth.users u
where u.email = 'johnwainer@gmail.com'
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = 'super_admin';
