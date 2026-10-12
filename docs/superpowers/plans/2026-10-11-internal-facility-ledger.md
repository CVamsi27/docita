# Internal facility ledger implementation plan

> **For agentic workers:** Use test-driven-development to execute these checkbox steps in the current feature branch. The user explicitly approved app and internal implementation and deferred landing.

**Goal:** Implement the approved Dashboard facility ledger and review region in both existing themes.

**Architecture:** Preserve the current dashboard queries, current-page filter, cursor navigation and edit invalidation. Store selection by ID and derive the selected facility from the latest loaded response. Reuse RecordWorkspace from the Today plan for the desktop region and narrow-screen Sheet; reuse the existing edit dialog.

**Tech Stack:** Node >=22.22.0, pnpm@10.30.3, Vite, React Router, React Query, Vitest and shared UI.

## Global constraints

- Keep `/dashboard`, existing sidebar groups, theme preference and role/tenant/audit behavior.
- Use `InternalClinicListEntry` from the canonical Zod contract; no detail cache or fabricated plan/billing values.
- Access tier, active state and returned subscription status are separate fields.
- Review cannot edit. The selected region owns one filled Edit facility action; Add facility remains quiet.
- Existing metrics remain available as a compact secondary region after the facility worklist.
- Search label states its loaded-page scope. Next depends on both `hasMore` and `nextCursor`.

### Task 1: Facility review behavior

**Files:** modify `apps/internal/src/features/dashboard/components/clinic-list.tsx`, create `facility-review.tsx`, modify `edit-clinic-dialog.tsx` and `pages/dashboard-page.tsx`; extend `dashboard-page.test.tsx`.

**Interfaces:** ClinicList adds selectedId and `onReview(clinicId, trigger)`; FacilityReview consumes one `InternalClinicListEntry` and onUpdate. EditClinicDialog accepts an optional text trigger variant without altering request semantics.

- [x] Extend tests before implementation: Review opens a named preview with separate access tier/subscription status; switching page removes that preview; filtering and refresh cannot leave an editable stale facility; empty subscription text says Not recorded; a failed edit preserves entered values.

```tsx
fireEvent.click(screen.getByRole("button", { name: "Review facility: Alpha Clinic" }));
expect(screen.getByRole("dialog", { name: "Facility review" })).toBeInTheDocument();
expect(screen.getByText("Subscription status")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Next facilities page" }));
expect(await screen.findByText("Gamma Clinic")).toBeInTheDocument();
expect(screen.queryByRole("dialog", { name: "Facility review" })).not.toBeInTheDocument();
```

- [x] Run focused dashboard tests and observe missing Review failure.
- [x] Render a continuous Table with Name, Type, Access tier, Status and Review; phone uses ListRowGroup. Use shared status badges and explicit selected text, not color alone. Capture the initiating button for Sheet focus return.
- [x] Compose the selected region from canonical fields, readable contact values and actual counts. Render returned subscription status separately with Not recorded for blank strings. Edit uses the existing dialog with a text Button trigger. Reset form input from the latest canonical record when opening; preserve it after request failure.
- [x] Move the current metrics into a compact separated section below Facilities. Preserve all five values and trend values; do not introduce invented zero summaries. Preserve required-data DataState and retry.
- [x] Clear selection on page changes, after edits and when its record disappears; announce an update when a refresh removes a selected record. Keep search scope explicit and the existing cursor rules.
- [x] Run focused and complete internal tests and typecheck.

### Task 2: Console chrome and acceptance

**Files:** modify `apps/internal/src/components/layout/protected-layout.tsx`; add closest layout behavior test; update `design-qa.md` and implementation evidence.

- [x] Test accessible names of collapsed navigation, keyboard navigation, theme and sign-out controls before changing the shell.
- [x] Reuse original DocitaLogo, add the truthful Internal console/Operator topbar and retain every current nav destination. On mobile use a shared Sheet rather than allowing a fixed sidebar to squeeze the worklist. Preserve independently scrollable navigation and reachable footer. Use only token-driven color feedback.
- [x] Run internal `lint`, `check-types`, units, `build:cloudflare` and `pnpm audit:internal`; repository standards/hygiene/Knip and shared UI checks run with the Today slice.
- [x] Capture Facilities at desktop/tablet/phone in light and dark; compare with approved images. Check Review/Escape/focus return, pagination, edit failure/success and theme preference continuity.
- [x] Commit only after relevant checks pass: `feat(internal): implement facility review ledger`.

### Browser review corrections

- Name existing admin row actions and retain their separate view/edit/activation behavior.
- Align facility facts compactly and restore initiating Review focus after successful edits unmount the review. Preserve Edit focus on cancellation.

Acceptance evidence and browser refinement history are recorded in [design-qa.md](../../../design-qa.md). This slice is committed together with its shared composition and dependent application slice so consumers and primitive changes remain atomic.
