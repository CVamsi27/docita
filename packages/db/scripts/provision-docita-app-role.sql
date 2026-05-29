-- One-time operator script: enable LOGIN for docita_app before RLS_ENABLED=true.
-- Run as the RDS owner (postgres) via psql or a controlled migration window.
-- Replace the password placeholder; store the URL in Fly secrets:
--   postgresql://docita_app:SECRET@HOST:5432/docita?sslmode=require
--
-- See docs/compliance/RLS_ROLLOUT.md

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'docita_app') THEN
    RAISE EXCEPTION 'docita_app role missing — run migration 20260502143500_add_rls_policies first';
  END IF;
END
$$;

-- Replace __DOCITA_APP_PASSWORD__ before executing.
ALTER ROLE docita_app WITH LOGIN PASSWORD '__DOCITA_APP_PASSWORD__';
GRANT docita_app TO CURRENT_USER;
