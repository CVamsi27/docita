# Incident playbooks

One playbook per known failure mode. Each playbook follows the same
structure so an on-call engineer can read it under pressure:

1. **Detection signals** — what alerts/metrics fire
2. **First 5 minutes** — confirm scope, page if needed
3. **Mitigation** — concrete commands and config flips
4. **Validation** — how we know the mitigation worked
5. **Rollback criteria** — when to revert
6. **Post-incident** — what to capture for the report

Playbooks covered:

- [`db-connection-exhaustion.md`](db-connection-exhaustion.md)
- [`razorpay-outage.md`](razorpay-outage.md)
- [`cloudflare-upstream-timeout.md`](cloudflare-upstream-timeout.md)
- [`pdf-queue-backlog.md`](pdf-queue-backlog.md)
- [`openai-rate-limit.md`](openai-rate-limit.md)

For data-tier disasters, see [`../DR_RUNBOOK.md`](../DR_RUNBOOK.md).
