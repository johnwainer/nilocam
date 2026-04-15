-- Otorga el rol super_admin a un usuario existente.
-- Reemplaza 'tu@email.com' con el email real antes de ejecutar.

insert into public.profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email, 'Super Admin'),
  'super_admin'
from auth.users u
where u.email = 'tu@email.com'       -- ← cambia esto
on conflict (id) do update
  set email        = excluded.email,
      display_name = excluded.display_name,
      role         = 'super_admin';
