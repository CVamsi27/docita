-- Historical placeholder to preserve migration history after the production
-- database was reconciled onto the SUPER_ADMIN -> INTERNAL path.
-- The actual schema changes now live in:
-- 1. 20251123161005_add_tiers_and_super_admin
-- 2. 20260408192900_add_internal_to_role_enum
-- 3. 20260408193000_replace_super_admin_with_internal
SELECT 1;
