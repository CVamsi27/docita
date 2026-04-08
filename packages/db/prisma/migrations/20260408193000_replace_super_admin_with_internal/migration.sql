-- Normalize legacy SUPER_ADMIN users to INTERNAL and remove SUPER_ADMIN from the Role enum.
CREATE TYPE "Role_new" AS ENUM (
  'DOCTOR',
  'RECEPTIONIST',
  'ADMIN',
  'INTERNAL',
  'ADMIN_DOCTOR',
  'PATIENT'
);

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "MemberJoinRequest" ALTER COLUMN "requestedRole" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE
      WHEN "role"::text = 'SUPER_ADMIN' THEN 'INTERNAL'
      ELSE "role"::text
    END
  )::"Role_new";

ALTER TABLE "MemberJoinRequest"
  ALTER COLUMN "requestedRole" TYPE "Role_new"
  USING (
    CASE
      WHEN "requestedRole"::text = 'SUPER_ADMIN' THEN 'INTERNAL'
      ELSE "requestedRole"::text
    END
  )::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DOCTOR';
ALTER TABLE "MemberJoinRequest" ALTER COLUMN "requestedRole" SET DEFAULT 'DOCTOR';
