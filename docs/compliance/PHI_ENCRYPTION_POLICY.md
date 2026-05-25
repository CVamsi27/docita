# PHI Encryption Policy

Docita encrypts patient contact and identity display fields at the Prisma
extension boundary before patient rows are persisted. The current encrypted
field list is maintained in `EncryptionService.encryptPatientData()` and must
match `decryptPatientData()`.

## Encrypted Patient Fields

- `email`
- `phoneNumber`
- `address`
- `emergencyContactPhone`
- `emergencyContactName`
- `firstName`
- `lastName`

`pnpm check:phi-encryption-coverage --enforce` verifies that the encrypt and
decrypt field lists stay aligned and that the Prisma result extension exposes a
decryptor for every encrypted field.

## Tenant-Scoped Identifiers

The following patient fields remain plaintext because they are used for
tenant-scoped lookup, uniqueness, list filtering, or clinical summary display:

- `mrn`
- `bloodGroup`
- `allergies`
- `medicalHistory`
- `customData`
- `emergencyContactRelation`

These fields are protected by tenant scoping, RBAC, audit logging, RLS-oriented
repository boundaries, and PHI read-audit checks. They must not be logged in
plaintext.

## Changing Scope

Encrypting any lookup or indexed field requires a migration plan before code
changes:

1. Add an encrypted shadow column or deterministic lookup digest where search is
   required.
2. Backfill existing rows in batches with audit logging enabled.
3. Update repositories and query contracts to use the new lookup strategy.
4. Run `pnpm check:phi-encryption-coverage --enforce`, API type checks, and
   affected patient-flow tests.

Do not add new patient PHI fields without either including them in
`encryptPatientData()` or documenting why tenant scoping and audit controls are
the correct protection boundary.
