# Encryption Key Rotation

Use this runbook when rotating `ENCRYPTION_KEY` for patient-field encryption.
All keys are 64-character hex strings generated from 32 random bytes.

## Existing ciphertext and key labels

`EncryptionService` continues to write the existing `v1:iv:tag:ciphertext`
format. The `v1` label does not identify a globally unique key: a previous current
key and a replacement current key can both have written `v1` ciphertext. Older
unversioned `iv:tag:ciphertext` values have the same ambiguity. Do not relabel
stored ciphertext or infer that a historical key is unused from its prefix.

Decryption tries the labelled key first, then the remaining distinct configured
keys. Each attempt must pass AES-GCM authentication before plaintext is returned.
The configured current key plus historical slots `V2` through `V5` bound these
attempts; duplicate key bytes are tried only once. An unrecognised label retains
the same authenticated fallback. If no key authenticates, the existing API returns
the ciphertext and emits a generic failure log. A request succeeding without an
exception therefore does not prove successful decryption.

This compatibility behavior does not recover a lost key or replace independent
key custody. Preserve every key still needed by live ciphertext, retained backups
and quarantined recovery copies. Keep recovery identities offline; the backup
writer needs only the age public recipient. See
[independent backup recovery](ENCRYPTED_DATABASE_BACKUPS.md).

## Preconditions

- Confirm the current deploy has `ENCRYPTION_KEY` set and startup validation is
  passing.
- Confirm `pnpm check:phi-encryption-coverage --enforce` passes on the release
  branch.
- Rehearse current, historical and legacy-format recovery with synthetic values
  in the candidate:

  ```sh
  pnpm --filter @docita/api exec jest --runInBand --runTestsByPath src/shared/common/encryption.service.spec.ts
  ```

- Verify the same exact plaintext recovery checks against the compiled artifact
  actually deployed to every affected service, using disposable keys in an
  isolated invocation without modifying runtime configuration. Record artifact
  identity and current, retained-key `v1`, legacy and tamper results. Candidate
  unit tests do not prove the deployed decoder supports rotation. If either
  retained-key recovery check fails, stop before changing any key and release
  the compatible decoder through the reviewed staging/release path first.
- Inventory all canonical encryption consumers using aggregate format checks
  without exporting or decrypting clinical rows. A zero match count does not
  prove that retained backups, recovery copies or historical consumers no longer
  need a key. Prefixes do not identify which key authenticated a value.
- Inventory the retained keys and their independent protected recovery copies.
  Preserve existing historical slots; if all four are occupied, stop and prepare
  a verified re-encryption/retirement plan before replacing any key. `V6` is not
  an implemented slot.
- Schedule the rotation during a low-traffic window.

The [17 October incident](../audits/2026-10-17-credential-exposure-incident.md)
records failed retained-key `v1` and legacy recovery in the unchanged deployed
artifact. Its 17-field aggregate inventory has no mapping gaps, but does not
close historical recovery dependencies. Production field-key rotation remains
blocked on the preconditions above.

## Rotation Steps

1. Generate a new key directly into the approved protected secret setup. Do not
   print it, place it in command arguments or commit it. Record only an opaque
   key identifier and custody evidence outside that secret setup.

2. Copy the current key into an unused historical slot, for example
   `ENCRYPTION_KEY_V2`. Do not overwrite an earlier historical key. Preserve the
   old value independently before changing the current value.

3. Set the new value as `ENCRYPTION_KEY` in the runtime secret store.

4. Restart API pods/workers so `EncryptionService` loads the new current key
   plus historical keys.

5. Verify startup loads the intended current key and historical key count. The
   logged `v1` label is not evidence of which key is active. Do not log key
   material, ciphertext or decrypted values.

6. Run a patient read/write smoke test:
   - create or update a non-production test patient,
   - verify encrypted fields read back correctly,
   - assert a synthetic value encrypted before rotation returns its exact known
     plaintext with only the retained key configuration available,
   - verify existing patient fields through authorised application behavior
     without logging PHI,
   - verify tampered ciphertext does not produce unauthenticated plaintext.

7. Keep the previous key in `ENCRYPTION_KEY_V2`/`V3`/`V4`/`V5` while any live
   ciphertext, retained backup or recovery copy may require it. A fixed 30-day
   wait is insufficient: live rows can outlast that period and independent
   backups have a 30-day lock with configured expiry after 31 days. Provider
   lifecycle execution is asynchronous.

8. Retire a historical key only after the inventory and authenticated recovery
   evidence establish that all dependent live values were migrated and every
   dependent backup/recovery copy expired or was disposed of under policy. Keep
   the key's independent recovery custody until that evidence is reviewed. Then
   remove only the approved obsolete slot and restart the affected services.

## Rollback

If decrypt failures appear after rotation, preserve both old and attempted keys
before changing anything. If new ciphertext was already written, keep its key in
an unused supported historical slot when restoring the prior current key. Do not
overwrite another retained key or discard the attempted key. Restart the affected
services and verify exact synthetic recovery under both keys before retrying.
If no historical slot is available, stop and use a reviewed recovery plan.
