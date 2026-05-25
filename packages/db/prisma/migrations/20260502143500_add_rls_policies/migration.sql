-- =============================================================================
-- Defense-in-depth row-level security (RLS) for tenant isolation
-- =============================================================================
--
-- This migration is intentionally additive and *gated*:
--   * a non-superuser application role (docita_app) is created so RLS applies
--     when the API connects as that role
--   * RLS is ENABLED on every table that owns a clinicId column
--   * a single tenant_isolation policy is added per table whose USING clause
--     is short-circuited by the runtime setting app.rls_enabled. While
--     app.rls_enabled is anything other than 'on', the policy allows all rows
--     and behavior is identical to today.
--
-- To enforce tenant isolation in a transaction, the application sets:
--   SET LOCAL app.rls_enabled = 'on';
--   SET LOCAL app.current_clinic_id = 'clinic-uuid';
--
-- Owners (the migration role) bypass RLS unless FORCE ROW LEVEL SECURITY is
-- set, which we do not enable here. Migrations therefore continue to work
-- without policy interference.
-- =============================================================================

-- Application role (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'docita_app') THEN
    CREATE ROLE docita_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Grant docita_app sufficient privileges on the public schema. Operators
-- should set a password and LOGIN before pointing the API at this role.
GRANT USAGE ON SCHEMA public TO docita_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO docita_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO docita_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO docita_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO docita_app;

-- Enable RLS + tenant_isolation policy on every table that has a clinicId
-- column. The policy USING clause defers to the runtime app.rls_enabled flag,
-- so this migration is a no-op behavior change until the flag is flipped.
DO $$
DECLARE
  rec RECORD;
  table_ident TEXT;
BEGIN
  FOR rec IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.column_name = 'clinicId'
      AND c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
  LOOP
    table_ident := format('%I.%I', rec.table_schema, rec.table_name);

    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_ident);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = rec.table_schema
        AND tablename = rec.table_name
        AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %s
           AS PERMISSIVE
           FOR ALL
           TO PUBLIC
           USING (
             current_setting(''app.rls_enabled'', true) IS DISTINCT FROM ''on''
             OR "clinicId" = current_setting(''app.current_clinic_id'', true)
           )
           WITH CHECK (
             current_setting(''app.rls_enabled'', true) IS DISTINCT FROM ''on''
             OR "clinicId" = current_setting(''app.current_clinic_id'', true)
           )',
        table_ident
      );
    END IF;
  END LOOP;
END
$$;
