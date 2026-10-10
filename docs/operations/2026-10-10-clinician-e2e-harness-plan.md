# Clinician E2E fixture and contract parity plan

Date: 10 October 2026. Follow-up to the approved improvement roadmap. The additional standalone `pnpm --filter @docita/app exec tsc --noEmit -p e2e/tsconfig.json` reports 17 errors in three untouched specs. The changed accessibility/Today specs report none. This is an open gate, not a passing whole-browser-suite typecheck.

## Reproduced scope

- `critical-flows.spec.ts`: a handwritten appointment response uses `scheduledAt` while its consumer requires canonical `startTime`/`endTime`.
- `patients.spec.ts`: six session-helper calls pass an unparsed user boundary. The legacy local fixture also creates clinics outside the current onboarding helper, stores incomplete browser auth and conditionally skips UI actions/selectors. Fixing only the argument type would not prove these journeys.
- `verify-doctor.spec.ts`: nullable token values are used as strings, and refresh-token JSON remains unnarrowed. Truthiness assertions do not narrow the TypeScript result. Registration/onboarding fixtures must also be checked against current Turnstile, consent and SLA requirements.

## Implementation order and acceptance

1. Reuse canonical schemas and the existing real `setupTestUser` / `loginUser` session helpers; narrow failures at the fixture boundary rather than add assertions or broaden types. Consult the single-source-of-truth registry for consent, SLA and token semantics.
2. Make patient create/list/search/validation and contextual AI assertions mandatory; align selectors with shared Select/date primitives and current routes. Cover actual empty/error and recovery paths where the journey requires them.
3. Parse appointment responses through the shared contract; verify the booked patient and persisted start/end values, preserving tenant/doctor ownership.
4. Keep signature/email-verification coverage real through owned API/PostgreSQL fixtures. Require canonical nonempty access tokens before cookie setup or authenticated calls; preserve optional refresh behavior.
5. Run each affected journey against the owned test stack, then the standalone E2E typecheck, relevant unit/contracts, lint/standards and browser projects. Record executed and blocked cases separately; do not treat compile success or skipped UI branches as journey evidence.

No production auth guard, onboarding compatibility, role/tier policy, provider credential or database migration change is authorized by this test-harness correction. Complete it as a separate reviewable slice; it does not prevent documenting the independently verified clinician accessibility repairs.
