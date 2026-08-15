alter table public.studio_settings
  add column if not exists instagram_access_token text,
  add column if not exists instagram_token_refreshed_at timestamptz;
