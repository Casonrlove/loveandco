alter table public.studio_settings
  add column if not exists resend_api_key text,
  add column if not exists notification_from_email text;
