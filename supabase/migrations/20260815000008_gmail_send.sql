alter table public.studio_settings
  add column if not exists gmail_app_password text;
