-- =============================================================================
-- NiloCam — Email templates v2
-- Idempotente. Ejecutar después de setup-email-settings.sql
-- Agrega plantillas: credits_adjusted, bank_transfer_received
-- =============================================================================

alter table public.email_settings
  add column if not exists tpl_credits_adjusted_subject        text not null default 'Ajuste de créditos en tu cuenta',
  add column if not exists tpl_credits_adjusted_body           text not null default '',
  add column if not exists tpl_bank_transfer_received_subject  text not null default 'Comprobante recibido — {{credits}} créditos en revisión',
  add column if not exists tpl_bank_transfer_received_body     text not null default '';

-- ─── RPC: get_email_settings (updated) ───────────────────────────────────────

create or replace function public.get_email_settings()
returns setof public.email_settings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.email_settings where id = 1;
$$;

-- ─── RPC: set_email_settings (updated with new params) ───────────────────────

create or replace function public.set_email_settings(
  p_provider                           text,
  p_resend_api_key                     text,
  p_smtp_host                          text,
  p_smtp_port                          integer,
  p_smtp_user                          text,
  p_smtp_password                      text,
  p_smtp_secure                        boolean,
  p_from_name                          text,
  p_from_email                         text,
  p_tpl_welcome_subject                text,
  p_tpl_welcome_body                   text,
  p_tpl_payment_confirmed_subject      text,
  p_tpl_payment_confirmed_body         text,
  p_tpl_bank_approved_subject          text,
  p_tpl_bank_approved_body             text,
  p_tpl_bank_rejected_subject          text,
  p_tpl_bank_rejected_body             text,
  p_tpl_credits_adjusted_subject       text,
  p_tpl_credits_adjusted_body          text,
  p_tpl_bank_transfer_received_subject text,
  p_tpl_bank_transfer_received_body    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_settings set
    provider                           = p_provider,
    resend_api_key                     = p_resend_api_key,
    smtp_host                          = p_smtp_host,
    smtp_port                          = p_smtp_port,
    smtp_user                          = p_smtp_user,
    smtp_password                      = p_smtp_password,
    smtp_secure                        = p_smtp_secure,
    from_name                          = p_from_name,
    from_email                         = p_from_email,
    tpl_welcome_subject                = p_tpl_welcome_subject,
    tpl_welcome_body                   = p_tpl_welcome_body,
    tpl_payment_confirmed_subject      = p_tpl_payment_confirmed_subject,
    tpl_payment_confirmed_body         = p_tpl_payment_confirmed_body,
    tpl_bank_approved_subject          = p_tpl_bank_approved_subject,
    tpl_bank_approved_body             = p_tpl_bank_approved_body,
    tpl_bank_rejected_subject          = p_tpl_bank_rejected_subject,
    tpl_bank_rejected_body             = p_tpl_bank_rejected_body,
    tpl_credits_adjusted_subject       = p_tpl_credits_adjusted_subject,
    tpl_credits_adjusted_body          = p_tpl_credits_adjusted_body,
    tpl_bank_transfer_received_subject = p_tpl_bank_transfer_received_subject,
    tpl_bank_transfer_received_body    = p_tpl_bank_transfer_received_body,
    updated_at                         = now()
  where id = 1;
end;
$$;

notify pgrst, 'reload schema';
