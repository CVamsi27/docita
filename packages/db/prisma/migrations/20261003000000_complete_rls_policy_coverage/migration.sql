-- =============================================================================
-- Complete tenant_isolation coverage for tables added after 2026-05-02
-- =============================================================================
--
-- The policy loop in 20260502143500_add_rls_policies ran exactly once. Every
-- table created afterwards that carries a clinicId column therefore has RLS
-- disabled and no tenant_isolation policy, so it has no database-level tenant
-- backstop: a query that drops clinicId from its where clause reads and writes
-- across tenants even while app.rls_enabled = 'on'.
--
-- This migration re-applies the identical loop. It is additive and idempotent:
-- already-covered tables are skipped by the IF NOT EXISTS guard and the policy
-- text is unchanged, so behavior on covered tables does not change. Tables that
-- gain a policy here behave exactly as covered tables already do — scoped while
-- app.rls_enabled = 'on', unrestricted otherwise.
--
-- Coverage is verified by
--   pnpm --filter @workspace/db run db:check-tenant-isolation
-- which fails when any clinicId-bearing public table lacks a policy.
--
-- See docs/compliance/RLS_ROLLOUT.md.

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
