# Playbook: OpenAI rate-limited / outage

## Detection signals

- `apps/api` logs show `OpenAIRateLimitError` or `OpenAIServiceUnavailable`
  rising above 1% of AI calls.
- Sentry breadcrumbs around `OpenAIAdapter` show 429/503 responses.
- Users report: "AI assistant not responding" or "summary generation
  failed."

## First 5 minutes

1. Confirm scope at [status.openai.com](https://status.openai.com).
2. Check our 429/503 rate:
   ```
   fly logs -a <api-app> | grep -E "openai" | tail -200
   ```
3. Identify which endpoints are affected (chat, embeddings, etc.).

## Mitigation

- **Server-side**: ensure the OpenAI adapter has exponential backoff +
  jitter. If queuing was disabled, re-enable it.
- **User-facing**: enable the "AI assistant degraded" banner via
  `apps/internal` feature flag `aiAssistantDegraded`.
- **Fallback path**: critical workflows (prescriptions, billing) must
  not block on AI calls; verify the synchronous-AI usages have a
  graceful fallback (e.g., return the doctor's last manual note).
- **Cache**: confirm `AI_CACHE_ENABLED=true` so repeated identical
  prompts hit the cache instead of OpenAI.

## Validation

- 429 rate drops below 0.5%.
- AI assistant responds within 5 s for a smoke prompt.
- No critical workflow blocks on AI calls.

## Rollback criteria

- If the degraded banner was shown, remove it once 30 minutes of clean
  traffic have passed.

## Post-incident

- Review whether any synchronous AI calls in clinical workflows need
  to be moved to background / async patterns.
- File a follow-up to add a token-budget guardrail per tenant if a
  runaway integration triggered the limit.
