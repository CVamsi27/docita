# apps/worker

Background worker app for queue and scheduled processing.

## Boundaries

- Worker code must not import API HTTP controllers.
- Processors must declare retry/backoff, lock duration, idempotency, and failure/DLQ behavior.
- Logs must be structured and PHI-safe.
- Shared helpers must be worker-safe and must not rely on Next.js or request-only API state.

Current worker surface is minimal; `scripts/check-job-idempotency.mjs` guards future processors.
