-- Align ApiKey.createdById with Prisma schema referential action.
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_createdById_fkey";

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
