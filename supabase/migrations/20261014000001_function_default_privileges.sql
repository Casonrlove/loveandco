-- Postgres grants EXECUTE on new functions to PUBLIC by default, which the
-- 2026-09-26 table/sequence revoke did not cover. The revoke must be global:
-- a schema-scoped entry cannot remove the built-in PUBLIC grant (it has no
-- built-in defaults to subtract from). Every new function must now be granted
-- explicitly in the migration that creates it.
alter default privileges for role postgres
  revoke execute on functions from public;
