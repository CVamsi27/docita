# ADR 0016 — Patient-data lifecycle and recovery

- **Status:** Proposed — awaiting sign-off (backlog item **C01**, "Decision required")
- **Date:** 2026-10-03
- **Owners:** Security/operations (decision), Platform (implementation)
- **Backlog:** `docs/operations/DOCITA_IMPROVEMENT_BACKLOG.md` → C01

## Context

Encryption (`EncryptionService`, envelope keys), audit logging, storage
providers, DPDP rights flows and a DR runbook all exist. What does not exist is
evidence that they work as a *system* under loss: no restore has ever been
exercised, and the recovery procedure the runbook prescribes cannot run.

Reviewing the current state found these concrete issues.

### Issue 1 — the documented tenant-restore path does not exist (confirmed defect)

`RUNBOOKS.md` RB-06 ("Restore single tenant from backup") instructs the operator
to run:

```bash
pnpm --filter @workspace/db run export:tenant -- --clinic-id <id> --output ./tenant-export.sql
```

There is **no `export:tenant` script** in `packages/db/package.json` and no
matching file anywhere in the repository. The recovery step therefore fails at
the first command. A runbook that cannot be executed is worse than no runbook,
because it converts an incident into an improvisation.

### Issue 2 — the DR drill has never been run

`DR_RUNBOOK.md` states "Last drill: never" and prescribes a quarterly rotation.
`docs/operations/dr-drills/` does not exist, so no drill record has ever been
produced. RTO/RPO targets in that runbook (Postgres primary loss: RTO 60 min /
RPO 5 min via PITR; region loss: RTO 4 h / RPO 24 h) are therefore **unverified
targets**, not measured capabilities. The runbook itself names the Postgres
primary as the single largest exposure.

### Issue 3 — key rotation is documented but never rehearsed

`KEY_ROTATION.md` describes a sound procedure (historical `ENCRYPTION_KEY_V2..V5`
slots, 30-day retention, decrypt smoke test). Nothing in the repository records a
completed rotation. The critical unproven claim is that data written under a
previous key still decrypts after rotation — which is exactly what a restore
depends on, because a restored backup is ciphertext produced by whichever key
was current when it was taken.

### Issue 4 — deletion, retention and legal hold are implemented but not reconciled with recovery

`DPDP_READINESS.md` documents anonymization-not-deletion (NMC 3-year floor vs.
DPDP erasure) and a `DataRetentionScheduler` with per-class windows. This is
coherent for the live system. It is *not* reconciled with backup retention: a
snapshot taken before an erasure request still contains the pre-anonymization
row, and a restore from that snapshot would resurrect data the system has
contractually erased. No document states whether that is accepted, and if so for
how long.

## Decision

### D1 — Restore capability is a tested artifact, not a documented intention

**Definition.** "We can restore" means: a named operator has executed the
restore procedure end to end within the last quarter, against a real backup, and
recorded the measured time and the verified integrity checks.

**Consequence.** The `export:tenant` gap must be closed with a real, tested
script before RB-06 can be considered a recovery path. Until then, RB-06 is
marked **not executable** rather than left as a plausible-looking procedure.

### D2 — RTO/RPO targets become measured values with owners

**Definition.** Each row of the `DR_RUNBOOK.md` target table is either
(a) measured in a drill and recorded, or (b) explicitly marked unverified with a
named owner and a date by which it will be measured.

**Consequence.** A target that has never been measured must not be quoted in
customer-facing or compliance material as if it were a guarantee.

### D3 — A restore is only complete when the keys come with it

**Definition.** A restore verifies that PHI encrypted under the keys current at
backup time decrypts after restore. The key material required to read a backup
is part of the backup's recoverability, not a separate concern.

**Consequence.** Drill evidence must include a decrypt check on restored PHI,
and key-rotation rehearsal becomes a prerequisite for trusting any restore older
than the most recent rotation.

### D4 — Erasure vs. backup retention is decided explicitly, per data class

**Definition.** For each data class in `DataRetentionScheduler`, the product
states whether a restore may legitimately resurrect pre-erasure data, and for
how long after an erasure request that remains possible.

**Consequence.** Either backup retention is bounded below the erasure SLA, or the
resurrection window is documented and disclosed. Silence is not an option,
because a restore that resurrects erased PHI is a compliance event, not a
technical footnote.

### D5 — Deletion has an owner and a tested scope

**Definition.** Every deletion/anonymization path names its owner and has a test
that proves it removes or anonymizes exactly what it claims, across the database
and object storage, without touching other tenants.

## Acceptance criteria

The implementing work is complete when:

1. `export:tenant` exists, is covered by a test, and RB-06 executes end to end
   against a restored copy — or RB-06 is rewritten to a procedure that does.
2. One Postgres point-in-time restore drill is recorded under
   `docs/operations/dr-drills/YYYY-QN.md` with measured RTO/RPO and the integrity
   checks from `DR_RUNBOOK.md`.
3. One key-rotation rehearsal is recorded, including proof that a record written
   before rotation still decrypts afterwards.
4. Restored data is verified tenant-scoped: a cross-tenant read against the
   restored copy returns nothing (the S01 matrix in
   `packages/db/scripts/check-tenant-isolation.mjs` is the reusable harness).
5. The erasure-vs-backup-retention window is stated in `DPDP_READINESS.md` with
   an owner.

## Open questions for sign-off

1. **RTO/RPO approval:** are the current targets (60 min / 5 min PITR; 4 h /
   24 h region) the approved business targets, or do they need revision before
   being measured?
2. **Backup retention vs. erasure SLA:** what is the accepted maximum window in
   which a restore may resurrect erased data? This is a compliance decision.
3. **Object storage:** R2 is described as multi-region replicated, but has a
   restore of *referenced objects* (documents, PHI attachments) been validated
   to match the database's restore point? Orphaned references are a likely
   failure mode.
4. **Drill ownership:** who is the named owner for the first drill, and by when?
5. **Tenant-scoped restore:** is RB-06's export/import approach still the desired
   mechanism, or should point-in-time restore to a side database plus selective
   copy be the documented path?

## Consequences

**Positive.** Recovery stops being aspirational. A previously broken recovery
procedure is identified before an incident. Compliance statements about erasure
become defensible.

**Negative.** The first drill consumes operator time and requires a staging
environment capable of restoring a real backup. The erasure/backup decision may
require a retention-policy change with storage cost implications.

## References

- `docs/operations/DR_RUNBOOK.md` — targets, drill cadence, restore procedures
- `docs/operations/RUNBOOKS.md` — RB-06 (single-tenant restore), RB-07 (PHI leak)
- `docs/operations/KEY_ROTATION.md` — rotation procedure
- `docs/compliance/DPDP_READINESS.md` — erasure/retention reconciliation
- ADR [0005](0005-envelope-encryption-for-phi.md) — envelope encryption for PHI
- `packages/db/scripts/check-tenant-isolation.mjs` — reusable tenant verification
