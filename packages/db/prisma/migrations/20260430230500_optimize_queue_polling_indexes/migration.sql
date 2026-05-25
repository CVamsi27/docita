CREATE INDEX IF NOT EXISTS "QueueJob_name_status_priority_createdAt_idx"
ON "QueueJob" ("name", "status", "priority" DESC, "createdAt" ASC);
