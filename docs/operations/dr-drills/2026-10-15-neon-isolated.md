# Isolated Neon recovery drill — 15 October 2026

Status: **bounded provider recovery, encrypted synthetic canary and tenant-policy
rehearsal passed; full production recovery remains unverified**.

## Identity and scope

Authenticated Neon CLI access identifies Docita project `icy-river-59903017`,
PostgreSQL17 in `aws-ap-southeast-1`, production branch
`br-young-butterfly-a17arhtm`, endpoint `ep-plain-rain-a1zogxgl`. Its hostname
matches the API's configured database without printing that URL. Free-plan
history retention is 21,600 seconds (six hours).

The operator selected **keep Neon Free and prepare independent encrypted
backups**. No paid-plan upgrade, retention adjustment, production restore,
production SQL write, RLS credential cutover or traffic reassignment occurred.
See the [backup preparation plan](../../superpowers/plans/2026-10-15-independent-database-backups.md).

## Executed checks

| Check                       | Evidence and result                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Past-point branch           | Created `docita-recovery-drill-20261015` (`br-plain-shape-a17ip4xm`) from the explicit production parent at `2026-10-15T07:42:32Z`. Neon confirmed its point/parent and ready state. Separate endpoint `ep-muddy-bar-a1a8kjrt`; create request completed in 1.05 seconds. This is provisioning time, not production RTO.                                                                                               |
| Aggregate continuity        | Both targets have 165 recorded migrations, 91 tenant tables, zero clinics/patients/appointments/prescriptions/invoices/documents/audit rows and one dedicated monitor user. Counts match; orphaned patient/appointment and clinic-account onboarding checks return zero. Empty clinical tables limit this proof. No patient rows were exported.                                                                        |
| Encrypted historical canary | Inserted a known synthetic value encrypted with AES256-GCM into an owned drill schema, committed, recorded server timestamp `2026-10-15T08:01:57.426Z`, then deleted it. Original drill table has zero rows. A second child (`br-damp-lab-a1dk795j`) recovered that point and returned exactly one row. Authenticated decryption matched the known synthetic plaintext.                                                |
| Key custody                 | A bounded hash comparison confirms the protected local encryption key matches the running API key. Neither key nor ciphertext/patient content appears in public evidence. This verifies access at drill time, not independent offline escrow or loss-of-account recovery.                                                                                                                                              |
| Migration status            | Repository-safe dry-run reports 10 unapplied October migrations and exits 1 as expected for pending status. This is not an applied migration or a green deploy gate.                                                                                                                                                                                                                                                   |
| Additive RLS rehearsal      | Applied only the exact existing October coverage SQL on the isolated target (SHA256 `44e02206d2bdc34353fd9d6a1522beddd74a37441e1eb9fe852d4e3560251882`). Verified existing runtime-role privilege flags, enabled LOGIN with a disposable password, and ran separate admin/runtime connections. Strict probe passes **19/19**, zero skips; all 91 tenant tables have enabled RLS and `tenant_isolation` policies there. |
| R2/key exercise             | Through the existing API's configured R2 provider, uploaded one uniquely owned synthetic encrypted object, read it, authenticated/decrypted the known value, deleted it, and confirmed HEAD 404. Existing documents were untouched. This is object access and key continuity, not a historical-object restore.                                                                                                         |
| Cleanup                     | Deleted the canary child before its parent; authenticated branch inventory now contains only the original production branch and endpoint. Endpoint ID, branch association, region, compute limits and suspend settings are unchanged. Temporary connection credentials were removed from the private evidence directory.                                                                                               |
| API operating mode          | Public readiness returned HTTP 200 after a 29.53-second cold start. API idle shutdown remains enabled as selected by the user. The clinical worker was not started.                                                                                                                                                                                                                                                    |

## Pending migrations

The current production migration ledger predates these source migrations:

```text
20261003000000_complete_rls_policy_coverage
20261003010000_queue_job_claim_token
20261003020000_queue_token_number_unique
20261003030000_inventory_movement_operation_identity
20261003040000_telemetry_capture_and_route_identity
20261003050000_lab_result_release_and_notification_claims
20261003060000_code_catalog_provenance
20261003070000_insurance_claim_submission_and_evidence
20261003080000_appointment_request_pending_slot_hold
20261004120000_enterprise_trueup_alert_delivery_status
```

The initial recovery drill applied only the first SQL, without modifying
production's Prisma ledger. A subsequent fresh copy rehearsed the entire sequence:

- Branch `docita-migration-rehearsal-20261015` (`br-silent-morning-a1xghlfm`),
  explicit production parent and separate endpoint `ep-delicate-cake-a1xzth6h`.
- The repository-safe dry-run reported exactly these ten pending migrations and
  exited 1. Prisma applied all ten successfully on the isolated copy; the ledger
  advanced from 165 to 175 completed entries, with none failed or rolled back.
  The subsequent safe dry-run and database integrity guard both exited 0.
- Aggregate core-table counts were unchanged. All 91 tenant tables had RLS and
  tenant policies; the separate non-owner `docita_app` probe passed 19/19.
- The clone used the safe preflight and direct Prisma deployment for the actual
  apply. This narrowly scoped rehearsal avoided the legacy deploy wrapper's
  plaintext SQL backup and credential-bearing pg_dump argument. The disposable
  clone was the rollback boundary; this procedure does not authorize a direct
  production deployment or replace independent production backups.
- The owned branch and temporary connection credentials were removed. The final
  provider inventory contains only production. A read-only production post-check
  at `2026-10-15T08:58:52Z` still has 165 migrations, owner/BYPASSRLS access,
  `docita_app` NOLOGIN and 16 policy gaps across 91 tenant tables.

Old/new runtime compatibility, realistic populated-data behavior and authenticated
staging soak still require evidence before release. This copied database's empty
clinical tables do not establish a production migration duration or contention budget.

## Limits and required follow-up

- Production continues to connect as owner with BYPASSRLS and 16 missing tenant
  policies. Passing the isolated matrix does not certify production enforcement.
- No preexisting clinical documents, patient ciphertext, audit history or real
  financial rows exist in the copied target to validate. Synthetic proof is
  explicitly narrower than clinical continuity and reconciliation.
- No primary loss, region loss, object-account loss, production traffic cutover,
  independent-key recovery or complete RTO/RPO was exercised.
- Six-hour provider history cannot recover an older incident. Prepare the chosen
  independent encrypted backup job, dedicated storage/retention, operator-held
  recovery key, full dump restore and stale-backup alert before closing that gate.
- A bounded SQL rehearsal does not replace the required candidate-specific
  authenticated journeys and 24-hour staging RLS soak.

Private task-local evidence contains the raw provider responses, aggregate SQL
reports, exact CLI/test output and credential-free summaries. It is deliberately
outside Git and is not a public PHI or secret archive.
