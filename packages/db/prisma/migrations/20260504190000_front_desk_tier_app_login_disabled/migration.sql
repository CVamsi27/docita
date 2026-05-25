-- Front desk as a billed clinic tier + non-login anchor doctor profiles
ALTER TYPE "ClinicTier" ADD VALUE IF NOT EXISTS 'FRONT_DESK';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appLoginDisabled" BOOLEAN NOT NULL DEFAULT false;

-- Migrate clinics that only had workspace profile set
UPDATE "Clinic"
SET
  tier = 'FRONT_DESK'::"ClinicTier",
  settings = CASE
    WHEN settings IS NULL THEN jsonb_build_object('workspaceProfile', 'FRONT_DESK')
    WHEN jsonb_typeof(settings::jsonb) = 'object' THEN settings::jsonb || jsonb_build_object('workspaceProfile', 'FRONT_DESK')
    ELSE jsonb_build_object('workspaceProfile', 'FRONT_DESK')
  END
WHERE
  tier <> 'FRONT_DESK'::"ClinicTier"
  AND settings IS NOT NULL
  AND jsonb_typeof(settings::jsonb) = 'object'
  AND (settings::jsonb->>'workspaceProfile') = 'FRONT_DESK';
