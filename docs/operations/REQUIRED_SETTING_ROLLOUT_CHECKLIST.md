# Required-setting rollout checklist

Use this checklist when a release introduces a new mandatory clinic or user
setting. Existing clinic-associated users must keep workspace access while the
new requirement rolls out.

## Rollout sequence

1. **Expand**: add nullable or defaulted storage and code that handles old and
   new rows.
2. **Backfill**: populate derivable values with an additive migration or a
   reviewed, restart-safe job.
3. **Prompt**: collect non-derivable choices with a targeted in-app prompt or
   settings modal. Do not send existing users through full onboarding.
4. **Enforce**: enable validation only after backfill evidence and prompt
   telemetry show old rows are handled.
5. **Contract**: remove compatibility branches only after an audit proves the
   legacy state is no longer present.

## Required evidence

- Migration dry-run against a restored production-like database.
- Regression test for a new account.
- Regression test for a pre-change clinic-associated account with missing new
  state; the user still lands in the workspace.
- Reviewed rollback path for the enforcement step.
- Audit or metric showing remaining legacy rows before contract cleanup.

## Stop-ship conditions

- A clinic-associated user can be reset to the initial onboarding wizard.
- A required column is added without a compatibility default or backfill.
- Clean-install seed data is the only migration proof.
- Enforcement and destructive cleanup land in the same rollout without
  evidence that historical rows are ready.
