# Encryption Key Rotation

Use this runbook when rotating `ENCRYPTION_KEY` for patient-field encryption.
All keys are 64-character hex strings generated from 32 random bytes.

## Preconditions

- Confirm the current deploy has `ENCRYPTION_KEY` set and startup validation is
  passing.
- Confirm `pnpm check:phi-encryption-coverage --enforce` passes on the release
  branch.
- Schedule the rotation during a low-traffic window.

## Rotation Steps

1. Generate a new key:

   ```bash
   openssl rand -hex 32
   ```

2. Move the current key into the next historical slot, for example
   `ENCRYPTION_KEY_V2`.

3. Set the new value as `ENCRYPTION_KEY` in the runtime secret store.

4. Restart API pods/workers so `EncryptionService` loads the new current key
   plus historical keys.

5. Verify startup logs show the expected current key version and historical key
   count. Do not log key material.

6. Run a patient read/write smoke test:
   - create or update a non-production test patient,
   - verify encrypted fields read back correctly,
   - verify existing patient records written with the previous key still
     decrypt.

7. Keep the previous key in `ENCRYPTION_KEY_V2`/`V3`/`V4`/`V5` for at least 30
   days, or longer if backups using that key may be restored.

8. After the retention window, remove obsolete historical keys and restart the
   services.

## Rollback

If decrypt failures appear after rotation, restore the prior `ENCRYPTION_KEY`
as the current key, keep the attempted key in a historical slot, restart the
services, and investigate before retrying rotation.
