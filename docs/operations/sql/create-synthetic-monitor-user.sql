-- Use a new dedicated email and a locally generated bcrypt cost-10 hash.
-- This account has no clinic membership and cannot access tenant patient data.
-- An existing email causes a unique-key error; no existing account is changed.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

INSERT INTO "User" (
  "id", "email", "password", "name", "role", "clinicId",
  "emailVerified", "mfaEnabled", "onboardingStep",
  "createdAt", "updatedAt", "passwordChangedAt"
)
VALUES (
  gen_random_uuid()::text,
  lower(trim('REPLACE_WITH_MONITOR_EMAIL')),
  'REPLACE_WITH_BCRYPT_HASH',
  'Docita synthetic monitor',
  'RECEPTIONIST',
  NULL,
  true,
  false,
  'CHOOSE_PATH',
  now(), now(), now()
)
RETURNING "id", "email", "role", "clinicId";

COMMIT;
