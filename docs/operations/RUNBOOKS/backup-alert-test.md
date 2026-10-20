# Backup alert test containment

## Incident, 20 October 2026

The operator authorized two synthetic emails: one failed-run and one missed-run
alert. The agent left a one-minute Sentry test monitor and its monitor-scoped
email rule active overnight. Repeated missed check-ins matched an event-activity
condition with a 30-minute throttle. The rule recorded **27 triggers**, last at
**09:31 IST on 20 October**. This is not a verified delivered-email count. The
exercise exceeded its authorization and is not successful bounded delivery proof.

## Containment and readback

- Test monitor `2468414`, slug `new-monitor`, is **disabled** and does not accept
  check-ins. Its saved schedule is restored to hourly, with a 15-minute margin
  and a 26-minute runtime limit.
- Its dedicated test email rule `1392279` is **disabled** and will not send
  notifications. A subsequent page reload still shows 27 triggers and the same
  last-trigger time.
- Existing project alert `455162` was not changed. Synthetic issue `154674326`
  is retained as evidence. Do not submit a healthy check-in to imply a verified
  backup or delete the incident evidence.
- `DOCITA_BACKUPS_ENABLED=false`. No production dump, backup completion or
  schedule activation occurred. Already queued emails may still arrive.

Protected screenshots and the containment record are outside Git in the
20 October operator evidence directory. No recipient address, DSN, credential or
patient data belongs in this runbook.

## Before another live exercise

Keep both test resources disabled. Use local HTTP fixtures for ordinary
regression checks. A further live email exercise needs a reviewed automatic
cutoff that survives loss of the test runner, an explicit destination, a maximum
notification count and a deadline. Prove the cutoff with synthetic local inputs
before enabling anything remotely. A manual promise to disable the rule later
is insufficient. Obtain fresh authorization for additional live messages; the
earlier two-message authorization has been exceeded.

After a permitted exercise, disable its test rule and monitor, reload both
provider pages, and record their disabled states and final trigger count before
ending the work. Keep production alert routing separate from disposable test
rules. Restoring production backup monitoring also requires the
[backup activation gates](../ENCRYPTED_DATABASE_BACKUPS.md#live-activation-requirements).
