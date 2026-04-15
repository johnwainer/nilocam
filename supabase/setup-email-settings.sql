-- =============================================================================
-- NiloCam — Email settings
-- Idempotente: seguro de re-ejecutar.
-- Ejecutar en Supabase SQL Editor después de schema.sql y setup-payments-complete.sql
-- =============================================================================

-- ─── Tabla ───────────────────────────────────────────────────────────────────

create table if not exists public.email_settings (
  id                             integer     primary key default 1,
  constraint email_settings_singleton check (id = 1),

  -- Proveedor
  provider                       text        not null default 'disabled'
                                             check (provider in ('disabled', 'resend', 'smtp')),

  -- Resend
  resend_api_key                 text        not null default '',

  -- SMTP
  smtp_host                      text        not null default '',
  smtp_port                      integer     not null default 587,
  smtp_user                      text        not null default '',
  smtp_password                  text        not null default '',
  smtp_secure                    boolean     not null default false,

  -- Remitente
  from_name                      text        not null default 'Nilo Cam',
  from_email                     text        not null default 'noreply@example.com',

  -- Plantillas — si el body está vacío se usan los defaults del código
  tpl_welcome_subject            text        not null default 'Bienvenido a {{app_name}}, {{name}}',
  tpl_welcome_body               text        not null default '',

  tpl_payment_confirmed_subject  text        not null default 'Pago confirmado — {{credits}} créditos',
  tpl_payment_confirmed_body     text        not null default '',

  tpl_bank_approved_subject      text        not null default 'Transferencia aprobada — {{credits}} créditos acreditados',
  tpl_bank_approved_body         text        not null default '',

  tpl_bank_rejected_subject      text        not null default 'Transferencia bancaria — revisión requerida',
  tpl_bank_rejected_body         text        not null default '',

  updated_at                     timestamptz not null default now()
);

-- Fila única inicial
insert into public.email_settings (id) values (1)
on conflict (id) do nothing;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.email_settings enable row level security;

drop policy if exists "email_settings super admin only" on public.email_settings;
create policy "email_settings super admin only"
  on public.email_settings for all
  using (public.is_super_admin());

-- ─── RPC: get_email_settings ──────────────────────────────────────────────────
-- Lee la configuración completa (incluye secrets). Solo para uso server-side.

create or replace function public.get_email_settings()
returns setof public.email_settings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.email_settings where id = 1;
$$;

-- ─── RPC: set_email_settings ──────────────────────────────────────────────────
-- Actualiza toda la fila. Solo super admin.

create or replace function public.set_email_settings(
  p_provider                       text,
  p_resend_api_key                 text,
  p_smtp_host                      text,
  p_smtp_port                      integer,
  p_smtp_user                      text,
  p_smtp_password                  text,
  p_smtp_secure                    boolean,
  p_from_name                      text,
  p_from_email                     text,
  p_tpl_welcome_subject            text,
  p_tpl_welcome_body               text,
  p_tpl_payment_confirmed_subject  text,
  p_tpl_payment_confirmed_body     text,
  p_tpl_bank_approved_subject      text,
  p_tpl_bank_approved_body         text,
  p_tpl_bank_rejected_subject      text,
  p_tpl_bank_rejected_body         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Solo el super admin puede modificar la configuración de email.';
  end if;

  update public.email_settings set
    provider                       = p_provider,
    resend_api_key                 = p_resend_api_key,
    smtp_host                      = p_smtp_host,
    smtp_port                      = p_smtp_port,
    smtp_user                      = p_smtp_user,
    smtp_password                  = p_smtp_password,
    smtp_secure                    = p_smtp_secure,
    from_name                      = p_from_name,
    from_email                     = p_from_email,
    tpl_welcome_subject            = p_tpl_welcome_subject,
    tpl_welcome_body               = p_tpl_welcome_body,
    tpl_payment_confirmed_subject  = p_tpl_payment_confirmed_subject,
    tpl_payment_confirmed_body     = p_tpl_payment_confirmed_body,
    tpl_bank_approved_subject      = p_tpl_bank_approved_subject,
    tpl_bank_approved_body         = p_tpl_bank_approved_body,
    tpl_bank_rejected_subject      = p_tpl_bank_rejected_subject,
    tpl_bank_rejected_body         = p_tpl_bank_rejected_body,
    updated_at                     = now()
  where id = 1;
end;
$$;

notify pgrst, 'reload schema';
