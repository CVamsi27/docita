-- Front-desk mode is encoded only on clinic.tier (FRONT_DESK SKU).
-- Promote any remaining profile-only clinics, then strip workspaceProfile from settings.

UPDATE "Clinic"
SET tier = 'FRONT_DESK'::"ClinicTier"
WHERE
  tier <> 'FRONT_DESK'::"ClinicTier"
  AND settings IS NOT NULL
  AND jsonb_typeof(settings::jsonb) = 'object'
  AND (settings::jsonb->>'workspaceProfile') = 'FRONT_DESK';

UPDATE "Clinic"
SET settings = (settings::jsonb - 'workspaceProfile')::json
WHERE
  settings IS NOT NULL
  AND jsonb_typeof(settings::jsonb) = 'object'
  AND (settings::jsonb ? 'workspaceProfile');
