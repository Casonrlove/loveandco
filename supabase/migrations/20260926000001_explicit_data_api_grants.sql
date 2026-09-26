-- Supabase stops auto-granting Data API access to new public tables on 2026-10-30.
-- Opt in now so every table must be granted explicitly in the migration that creates it.
-- Existing tables keep the grants set by earlier migrations.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
