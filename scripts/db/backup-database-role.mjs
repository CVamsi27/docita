// Catalog-only proof; never run mutation probes against the backup source.
export const BACKUP_ROLE_SQL = `
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '10000ms';
SET LOCAL lock_timeout = '2000ms';
WITH app_namespaces AS (
  SELECT oid FROM pg_namespace
  WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
), app_relations AS (
  SELECT c.oid, c.relkind FROM pg_class c
  JOIN app_namespaces n ON n.oid = c.relnamespace
)
SELECT (
  current_user = session_user AND r.rolcanlogin AND r.rolbypassrls
  AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication)
  AND current_setting('transaction_read_only') = 'on'
  AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid)
  AND NOT EXISTS (
    SELECT 1 FROM pg_roles other
    WHERE other.oid <> r.oid AND other.rolcanlogin
      AND NOT other.rolsuper AND NOT other.rolbypassrls
      AND pg_has_role(other.oid, r.oid, 'SET')
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_shdepend d
    WHERE d.refclassid = 'pg_catalog.pg_authid'::regclass
      AND d.refobjid = r.oid AND d.deptype = 'o'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_database d WHERE has_database_privilege(r.oid, d.oid, 'CREATE')
  )
  AND NOT EXISTS (
    SELECT 1 FROM app_namespaces n WHERE has_schema_privilege(r.oid, n.oid, 'CREATE')
  )
  AND NOT EXISTS (
    SELECT 1 FROM app_relations c WHERE CASE WHEN c.relkind IN ('r', 'p', 'v', 'm', 'f')
      THEN has_table_privilege(r.oid, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR has_any_column_privilege(r.oid, c.oid, 'INSERT,UPDATE,REFERENCES') ELSE false END
  )
  AND NOT EXISTS (
    SELECT 1 FROM app_relations c WHERE CASE WHEN c.relkind = 'S'
      THEN has_sequence_privilege(r.oid, c.oid, 'USAGE,UPDATE') ELSE false END
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.oid >= 16384 AND p.prosecdef
      AND has_schema_privilege(r.oid, p.pronamespace, 'USAGE')
      AND has_function_privilege(r.oid, p.oid, 'EXECUTE')
  )
  AND NOT EXISTS (
    SELECT 1 FROM app_relations c WHERE CASE WHEN c.relkind IN ('r', 'p', 'm')
      THEN NOT has_table_privilege(r.oid, c.oid, 'SELECT') ELSE false END
  )
  AND NOT EXISTS (
    SELECT 1 FROM app_relations c WHERE CASE WHEN c.relkind = 'S'
      THEN NOT has_sequence_privilege(r.oid, c.oid, 'SELECT') ELSE false END
  )
) AS allowed
FROM pg_roles r WHERE r.rolname = current_user;
ROLLBACK;
`;
