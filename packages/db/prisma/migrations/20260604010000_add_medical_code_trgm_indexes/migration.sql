CREATE INDEX IF NOT EXISTS "IcdCode_code_trgm_idx"
  ON "IcdCode" USING gin ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "IcdCode_description_trgm_idx"
  ON "IcdCode" USING gin ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CptCode_code_trgm_idx"
  ON "CptCode" USING gin ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CptCode_description_trgm_idx"
  ON "CptCode" USING gin ("description" gin_trgm_ops);
