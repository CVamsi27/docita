-- IcdCode and CptCode search uses ILIKE '%query%' on code and description.
-- B-tree indexes don't help with mid-string patterns; GIN trigram indexes do.
-- pg_trgm extension is already enabled (see 20260603010000_add_pg_trgm_fuzzy_search).

CREATE INDEX IF NOT EXISTS "IcdCode_code_trgm_idx"
  ON "IcdCode" USING gin ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "IcdCode_description_trgm_idx"
  ON "IcdCode" USING gin ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CptCode_code_trgm_idx"
  ON "CptCode" USING gin ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CptCode_description_trgm_idx"
  ON "CptCode" USING gin ("description" gin_trgm_ops);
