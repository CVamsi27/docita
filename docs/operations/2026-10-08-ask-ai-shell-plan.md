# Ask AI preview shell implementation plan

> Execute inline using the installed executing-plans workflow. This fixes the reproduced Today browser failure under the approved UI roadmap and existing UI standard §4/§7, without enabling an AI provider.

**Goal:** The existing Ask AI preview dialog has an accessible name, a visible context chip, localized preview/disclaimer copy and keyboard focus return.

**Architecture:** Reuse `DialogHeader`, `DialogTitle`, `DialogDescription`, `Badge` and `MicroLabel` from `@workspace/ui`. Use the existing AskAiContext scope; render only its label, not payload. Localize shell copy in the existing English/Hindi `AiAssistant` catalogs and Today's scope in Dashboard catalogs. The shell remains an explicitly unavailable preview; no clinical suggestions, prompt submission, history storage, AI/provider integration or PHI transfer.

**Design:** A compact modal using the existing clinical token palette, Inter dialog title, restrained accent icon/context treatment and a separated muted disclaimer footer. Preserve shared spacing, mobile sheet behavior and focus management. Remove the unnecessary 300px blank placeholder area. This is a repair of the preview shell, not completion of the full-screen conversational AI feature.

## Task 1 — Reproduce dialog contract failure

**Create:** `apps/app/src/components/ask-ai/ask-ai-overlay.test.tsx`.

- [x] Render the real provider and overlay with an external trigger that sets a synthetic Today scope. Assert a dialog named Ask AI, the context label, the explicit preview and exact medical-advice disclaimer. Before implementation the unnamed dialog assertion fails.
- [x] Close using Escape and verify the dialog disappears and focus returns to the trigger. Verify an unscoped dialog omits stale/context labels and the Hindi shell uses translated strings.

## Task 2 — Implement with existing primitives

**Modify:** `apps/app/src/components/ask-ai/ask-ai-overlay.tsx`, `apps/app/src/components/ask-ai/ask-ai-provider.tsx`, `apps/app/src/features/dashboard/components/today/today-page-content.tsx`, `apps/app/src/messages/{en,hi}/{AiAssistant,Dashboard}.json`.

- [x] Replace the bare header span with DialogTitle in DialogHeader and the existing preview with DialogDescription. Mark the accent Sparkles icon decorative. Render the existing scope label inside a wrapping Badge under a localized MicroLabel.
- [x] Add the exact English disclaimer `AI suggestions are not medical advice.` and corresponding Hindi copy in the muted footer; translate preview/title/context labels through AiAssistant.
- [x] Replace Today's hard-coded English scope label with Dashboard's translated `today.askAiScope`. Preserve scope ID `today`, trigger label, auth/permission behavior. Clear the previous scope when opening without one, so global entry does not present stale workflow context.

## Task 3 — Verify and document

- [x] Run focused overlay regressions, full app unit tests, typecheck, lint, standards/i18n parity, Knip and Cloudflare app build.
- [x] Strengthen the existing Today Ask AI browser case to assert context/disclaimer, no serious/critical axe violations, Escape close and focus return. Verify Today cases plus schedule recovery at 360px/1440px, light/dark themes using the owned fixture.
- [x] Update the all-screens matrix, roadmap/backlog and a dated acceptance record. Explicitly keep full conversational AI/provider work and production evidence open. Stop owned resources, commit through normal hooks, verify clean tree; no push or deployment.

## Context regression on 10 October

Opening the real provider with Today scope, closing, then opening from a global trigger retained the old context. The new regression fails before the correction (one failure, three passes). `openOverlay` now sets the requested scope or null on every open. This keeps scoped entry accurate and makes global entry omit the stale chip.

Acceptance: [10 October local validation](releases/2026-10-10-today-ux-validation.md). Owned fixture cleanup is deferred until the immediately following clinician audit slice; no push or deployment.
