# Workspace-wide ledger final pass

> For agentic workers: execute inline with focused behavior tests. The user approved the Day ledger direction and explicitly requested all pages, a final pass, then commit and push. Landing remains deferred.

**Goal:** Carry the selected ledger presentation through every clinician/internal workspace route, correct discovered navigation and keyboard gaps, and push the verified feature branch.

**Architecture:** Scope shared presentation to the existing protected workspace roots rather than changing the universal Card default. Clinical editors keep their current identity, save/complete guards and scrolling. Page families retain existing calendar, table, timeline, analytics and form behaviors. Auth/setup, patient/partner/lab portals and development tools retain their distinct shells; they are reviewed as compatibility surfaces, not converted into clinician workspaces.

**Tech stack:** Node >=22.22.0, pnpm 10.30.3, Vite/React Router, shared UI tokens, Vitest and Playwright.

## Design carried from the approved specification

Every protected route inherits continuous neutral sections, restrained rules, readable page/section hierarchy and shared light/dark colors. Explicit semantic backgrounds and focus/selection utilities remain authoritative. A workspace does not lose form grouping, warning boundaries, scroll containment, charts, permission gates, or pending/error/empty states. The layout is opt-in through `ui-workspace-ledger` on the clinician main and internal AppShell main; landing/public forms do not inherit this class.

Settings becomes one keyboard-accessible list of actual destinations. Audit Log opens the existing compliance audit section instead of a tab the settings page does not implement. Internal role counts become pressed Buttons, not clickable Cards. Doctor/feedback actions are named by record identity. Tables retain their real columns and contained scrolling where the existing route requires it.

## Task 1: Common workspace composition

Files: `packages/ui/src/styles/globals.css`, `packages/ui/src/components/indicators/card.tsx`, both protected layouts, `docs/ui/UI_UX_STANDARD_2026.md`.

- [x] Add `min-w-0` to shared Card so a table/chart cannot force its grid column wider than the workspace.
- [x] Add scoped component-layer ledger rules for neutral Card/Section surfaces: transparent background, no lateral frame or shadow, square continuous section corners. Utility/semantic styles continue to override component-layer defaults.
- [x] Give compact PageHeader h1 the page typography scale inside ledger roots; section h2 retains its smaller scale.
- [x] Apply the ledger class to the existing main regions, preserving encounter scrolling and sidebar behavior.
- [x] Build both apps and verify actual dark/light computed styles, semantic warnings and contained tables in rendered routes.

## Task 2: Settings navigation

Files: `apps/app/src/features/settings/pages/settings-page.tsx`, its test, and the existing compliance audit section.

- [x] Write regression expecting a real Link named Account and the Audit Log href `/settings/compliance#audit-log`; run and observe failure.
- [x] Replace click-only divs with shared ListRowGroup/ListRow, Button asChild and React Router Link; preserve all destinations/copy/icons and visible focus.
- [x] Set `id="audit-log"` on the existing audit section. Preserve its query/access behavior.
- [x] Run settings regressions and app typecheck.

## Task 3: Internal filters and names

Files: users page/test, doctors page/test, feedback page/test.

- [x] Write regression for role-filter Button pressed state and selection; add per-record accessible names for doctor/feedback View controls. Run these tests before fixes.
- [x] Replace role Cards with shared Buttons retaining real counts and `aria-pressed`; mark decorative icons hidden. Keep original filtering and record dialog behavior.
- [x] Add accessible labels containing visible View wording and actual record identity. Keep requests/disabled behavior unchanged.
- [x] Run internal units and typecheck.

## Task 4: Acceptance and push

Files: `design-qa.md`, this plan, browser acceptance tests when needed.

- [x] Enumerate both actual route trees and record scope/coverage; distinguish inherited workspace presentation from unchanged public shells and dynamic record fixtures.
- [x] Run app/internal/UI units, lint, typechecks, both Cloudflare builds, app/internal accessibility audits, repository standards/hygiene/Knip/colors. Any expanded route audit uses dedicated synthetic accounts and existing contracts.
- [x] Capture representative list/form/analytics/clinical pages in light/dark and at phone/desktop widths; inspect actual composition and keyboard controls. Preserve comparison evidence in the existing artifact directory.
- [x] Update QA with measured results and limitations, not claims of route-specific redesign where only common presentation changed.
- [x] Commit after checks pass, then normal push to the existing feature branch with hooks. Verify remote tip and clean tree. Do not deploy or merge.

The expanded route checks also corrected canonical paginated clinic consumption, accessible operational filters, shared table keyboard scrolling, WhatsApp/payment-date overflow, the Floor locked-page heading and collapsed clinician rail rendering. Evidence and final acceptance are recorded in `design-qa.md`; publication is verified after the normal commit/push hooks.
